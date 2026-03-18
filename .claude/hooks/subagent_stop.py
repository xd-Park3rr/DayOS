#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from common import (
    append_jsonl,
    current_phase,
    extract_agent_output_text,
    load_event,
    parse_agent_result,
    resolve_repo_root,
    runtime_path,
)

RUN_STATE_FILE = runtime_path("agent-run-state.json")
RUN_LOG = runtime_path("agent-runs.jsonl")
FAILURE_LOG = runtime_path("agent-failures.jsonl")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def first_string(event: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = event.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def transcript_agent_id(transcript_path: str) -> str:
    return Path(transcript_path).stem or "unknown-agent"


def agent_id_for(event: dict[str, Any], transcript_path: str) -> str:
    return first_string(event, "agent_id", "session_id") or transcript_agent_id(transcript_path)


def agent_type_for(event: dict[str, Any], run_state: dict[str, Any], agent_id: str) -> str:
    return (
        first_string(event, "agent_type", "agent_name", "name", "subagent_type")
        or str(run_state.get(agent_id, {}).get("agentType") or "unknown-agent")
    )


def task_summary_for(event: dict[str, Any], run_state: dict[str, Any], agent_id: str) -> str:
    return (
        first_string(event, "task_description", "task", "prompt", "description", "input")
        or str(run_state.get(agent_id, {}).get("taskSummary") or "No task summary provided.")
    )


def load_run_state(repo_root: Path) -> dict[str, Any]:
    path = repo_root / RUN_STATE_FILE
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def save_run_state(repo_root: Path, state: dict[str, Any]) -> None:
    path = repo_root / RUN_STATE_FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2), encoding="utf-8")


def duration_ms(started_at: str | None, finished_at: str) -> int | None:
    if not started_at:
        return None
    try:
        started = datetime.fromisoformat(started_at)
        finished = datetime.fromisoformat(finished_at)
    except ValueError:
        return None
    return max(0, int((finished - started).total_seconds() * 1000))


def load_failure_entries(repo_root: Path) -> list[dict[str, Any]]:
    path = repo_root / FAILURE_LOG
    if not path.exists():
        return []
    entries: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            entries.append(payload)
    return entries


def retry_count_for(
    repo_root: Path,
    *,
    phase: str,
    agent_type: str,
    task_summary: str,
    status: str,
) -> int:
    if status != "retryable_failure":
        return 0
    count = 0
    for entry in load_failure_entries(repo_root):
        if (
            entry.get("phase") == phase
            and entry.get("agentType") == agent_type
            and entry.get("taskSummary") == task_summary
            and entry.get("status") == "retryable_failure"
        ):
            count += 1
    return count + 1


def synthetic_contract_failure(error: str) -> dict[str, Any]:
    return {
        "status": "non_retryable_failure",
        "failureClass": "contract",
        "summary": error,
        "evidence": ["SubagentStop hook could not validate a final AGENT_RESULT line."],
        "artifacts": [],
        "nextAction": {"type": "stop", "target": None},
        "needsUserDecision": False,
    }


def main() -> None:
    event = load_event()
    repo_root = resolve_repo_root(event)
    run_state = load_run_state(repo_root)

    transcript_path = first_string(event, "transcript_path")
    agent_id = agent_id_for(event, transcript_path)
    agent_type = agent_type_for(event, run_state, agent_id)
    task_summary = task_summary_for(event, run_state, agent_id)
    phase = str(run_state.get(agent_id, {}).get("phase") or current_phase(repo_root))
    finished_at = now_iso()

    output_text = extract_agent_output_text(event)
    result, parse_error = parse_agent_result(output_text)
    stop_hook_active = bool(event.get("stop_hook_active"))

    if result is None and parse_error and not stop_hook_active:
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": (
                        "Your final response must end with exactly one final AGENT_RESULT {...} line. "
                        f"{parse_error}"
                    ),
                }
            )
        )
        return

    if result is None:
        result = synthetic_contract_failure(parse_error or "Missing AGENT_RESULT line.")

    started_at = str(run_state.get(agent_id, {}).get("timestamp") or "")
    duration = duration_ms(started_at, finished_at)
    retry_count = retry_count_for(
        repo_root,
        phase=phase,
        agent_type=agent_type,
        task_summary=task_summary,
        status=str(result["status"]),
    )
    effective_status = (
        "blocked"
        if str(result["status"]) == "retryable_failure" and retry_count > 1
        else str(result["status"])
    )

    stop_record = {
        "event": "subagent_stop",
        "timestamp": finished_at,
        "sessionId": first_string(event, "session_id"),
        "agentId": agent_id,
        "agentType": agent_type,
        "phase": phase,
        "taskSummary": task_summary,
        "transcriptPath": transcript_path or None,
        "durationMs": duration,
        "status": result["status"],
        "effectiveStatus": effective_status,
        "failureClass": result["failureClass"],
        "summary": result["summary"],
        "nextAction": result["nextAction"],
        "needsUserDecision": result["needsUserDecision"],
    }
    append_jsonl(repo_root, RUN_LOG, stop_record)

    if effective_status != "success":
        failure_record = {
            **stop_record,
            "evidence": result["evidence"],
            "artifacts": result["artifacts"],
            "retryCount": retry_count,
        }
        append_jsonl(repo_root, FAILURE_LOG, failure_record)

    if agent_id in run_state:
        run_state.pop(agent_id, None)
        save_run_state(repo_root, run_state)

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
