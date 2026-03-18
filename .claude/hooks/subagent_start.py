#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from common import append_jsonl, current_phase, load_event, resolve_repo_root, runtime_path

RUN_STATE_FILE = runtime_path("agent-run-state.json")


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


def agent_type_for(event: dict[str, Any]) -> str:
    return first_string(event, "agent_type", "agent_name", "name", "subagent_type") or "unknown-agent"


def task_summary_for(event: dict[str, Any]) -> str:
    summary = first_string(event, "task_description", "task", "prompt", "description", "input")
    return summary or "No task summary provided."


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


def main() -> None:
    event = load_event()
    repo_root = resolve_repo_root(event)
    transcript_path = first_string(event, "transcript_path")
    agent_id = agent_id_for(event, transcript_path)
    agent_type = agent_type_for(event)
    timestamp = now_iso()
    record = {
        "event": "subagent_start",
        "timestamp": timestamp,
        "sessionId": first_string(event, "session_id"),
        "agentId": agent_id,
        "agentType": agent_type,
        "phase": current_phase(repo_root),
        "taskSummary": task_summary_for(event),
        "transcriptPath": transcript_path or None,
    }
    append_jsonl(repo_root, runtime_path("agent-runs.jsonl"), record)

    state = load_run_state(repo_root)
    state[agent_id] = record
    save_run_state(repo_root, state)

    system_message = (
        "Finish your final response with exactly one final line in this format: "
        'AGENT_RESULT {"status":"success|blocked|retryable_failure|non_retryable_failure",'
        '"failureClass":"context|tool|contract|domain|approval|timeout|null",'
        '"summary":"...",'
        '"evidence":["..."],'
        '"artifacts":["..."],'
        '"nextAction":{"type":"route|ask_user|stop","target":"agent-name|command-name|null"},'
        '"needsUserDecision":true|false}.'
    )
    print(json.dumps({"systemMessage": system_message}))


if __name__ == "__main__":
    main()
