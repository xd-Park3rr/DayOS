from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

BLOCKED_FILE_HINTS: dict[str, str] = {}

RULE_MATCHERS = {
    "repo-boundaries.md": (
        "CLAUDE.md",
        ".claude/*.md",
        "DayOS_ClaudeCode_Manual.md",
        "agentlayer-plan.md",
        "desktop/*.md",
    ),
    "ui-patterns.md": (
        "mobile/App.tsx",
        "mobile/src/components/*",
        "mobile/src/features/*",
    ),
    "data-and-state.md": (
        "mobile/src/db/*",
        "mobile/src/store/*",
        "mobile/src/types/*",
        "mobile/src/events/*",
        "mobile/src/services/admin/*",
        "mobile/src/services/calendar/*",
        "mobile/src/services/context/*",
        "mobile/src/services/guard/*",
        "mobile/src/services/music/*",
        "mobile/src/services/screentime/*",
        "mobile/src/services/sleep/*",
    ),
    "voice-and-intents.md": (
        "mobile/src/services/ai/*",
        "mobile/src/types/whisper-rn.d.ts",
    ),
    "testing.md": (
        "mobile/*.test.*",
        "mobile/*.spec.*",
        "mobile/src/*.test.*",
        "mobile/src/*.spec.*",
    ),
}

RUNTIME_DIR = ".claude/runtime"
AGENT_RESULT_PREFIX = "AGENT_RESULT "


def runtime_path(relative_name: str) -> str:
    return f"{RUNTIME_DIR}/{relative_name}"


def load_event() -> dict[str, Any]:
    raw = os.sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"_raw": raw}


def emit_output(
    hook_event_name: str,
    *,
    additional_context: str | None = None,
    permission_decision: str | None = None,
    permission_reason: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "hookSpecificOutput": {
            "hookEventName": hook_event_name,
        }
    }
    hook_output = payload["hookSpecificOutput"]
    if additional_context:
        hook_output["additionalContext"] = additional_context
    if permission_decision:
        hook_output["permissionDecision"] = permission_decision
    if permission_reason:
        hook_output["permissionDecisionReason"] = permission_reason
    print(json.dumps(payload))


def resolve_repo_root(event: dict[str, Any] | None = None) -> Path:
    candidates: list[Path] = []
    if event:
        cwd = event.get("cwd")
        if isinstance(cwd, str) and cwd:
            candidates.append(Path(cwd))
    claude_project_dir = os.environ.get("CLAUDE_PROJECT_DIR")
    if claude_project_dir:
        candidates.append(Path(claude_project_dir))
    candidates.append(Path.cwd())

    for candidate in candidates:
        resolved = candidate.resolve()
        for directory in (resolved, *resolved.parents):
            if (directory / ".git").exists():
                return directory
    return Path.cwd().resolve()


def normalize_repo_path(path_value: Any, repo_root: Path) -> str | None:
    if not isinstance(path_value, str) or not path_value.strip():
        return None

    candidate = Path(path_value)
    if not candidate.is_absolute():
        candidate = repo_root / candidate

    try:
        relative = candidate.resolve().relative_to(repo_root.resolve())
        return relative.as_posix()
    except Exception:
        fallback = path_value.replace("\\", "/").lstrip("./")
        return fallback or None


def strip_frontmatter(text: str) -> str:
    if not text.startswith("---"):
        return text.strip()

    parts = text.split("---", 2)
    if len(parts) == 3:
        return parts[2].strip()
    return text.strip()


def read_rule(repo_root: Path, filename: str) -> str:
    path = repo_root / ".claude" / "rules" / filename
    if not path.exists():
        return ""
    return strip_frontmatter(path.read_text(encoding="utf-8")).strip()


def build_path_policy_context(repo_root: Path, relative_path: str | None) -> str:
    if not relative_path:
        return ""

    matched_rules: list[str] = []
    for filename, patterns in RULE_MATCHERS.items():
        if any(fnmatch(relative_path, pattern) for pattern in patterns):
            rule_text = read_rule(repo_root, filename)
            if rule_text:
                matched_rules.append(f"{filename}:\n{rule_text}")

    return "\n\n".join(matched_rules)


def append_log(repo_root: Path, relative_file: str, message: str) -> None:
    log_path = repo_root / relative_file
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(message)


def append_jsonl(repo_root: Path, relative_file: str, payload: dict[str, Any]) -> None:
    append_log(repo_root, relative_file, json.dumps(payload, ensure_ascii=True) + "\n")


def log_blocked_attempt(repo_root: Path, tool_name: str, relative_path: str, reason: str) -> None:
    timestamp = datetime.now(timezone.utc).isoformat()
    append_log(
        repo_root,
        runtime_path("blocked.log"),
        f"{timestamp} {tool_name} {relative_path} :: {reason}\n",
    )


def tail(path: Path, line_count: int) -> str:
    if not path.exists():
        return "none"
    return "".join(path.read_text(encoding="utf-8").splitlines(keepends=True)[-line_count:]).strip() or "none"


def load_phase_state(repo_root: Path) -> dict[str, Any]:
    path = repo_root / runtime_path("phase-state.json")
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def current_phase(repo_root: Path) -> str:
    state = load_phase_state(repo_root)
    phase = state.get("phase")
    summary = state.get("summary")
    if phase is not None:
        return str(phase)
    if summary:
        return str(summary)
    return "none"


def extract_strings(value: Any) -> list[str]:
    strings: list[str] = []
    if isinstance(value, str):
        strings.append(value)
    elif isinstance(value, dict):
        for nested in value.values():
            strings.extend(extract_strings(nested))
    elif isinstance(value, list):
        for item in value:
            strings.extend(extract_strings(item))
    return strings


def read_transcript_tail(transcript_path: str | None) -> str:
    if not transcript_path:
        return ""
    path = Path(transcript_path)
    if not path.exists():
        return ""
    try:
        raw_lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    except OSError:
        return ""

    tail_lines = raw_lines[-40:]
    extracted: list[str] = []
    for line in tail_lines:
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            extracted.append(line)
            continue
        extracted.extend(extract_strings(payload))
    return "\n".join(extracted)


def extract_agent_output_text(event: dict[str, Any]) -> str:
    preferred_keys = (
        "final_response",
        "result",
        "response",
        "output",
        "message",
        "last_message",
        "completion",
        "transcript_tail",
    )
    for key in preferred_keys:
        value = event.get(key)
        if isinstance(value, str) and value.strip():
            return value
        if isinstance(value, (dict, list)):
            strings = [candidate for candidate in extract_strings(value) if candidate.strip()]
            if strings:
                return "\n".join(strings)

    transcript_path = event.get("transcript_path")
    if isinstance(transcript_path, str) and transcript_path.strip():
        return read_transcript_tail(transcript_path)
    return ""


def parse_agent_result(text: str) -> tuple[dict[str, Any] | None, str | None]:
    if not text.strip():
        return None, "Agent output was empty."

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return None, "Agent output was empty."

    final_line = lines[-1]
    if final_line.startswith(AGENT_RESULT_PREFIX):
        payload = final_line[len(AGENT_RESULT_PREFIX):].strip()
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError as exc:
            return None, f"AGENT_RESULT was not valid JSON: {exc.msg}"
        if not isinstance(parsed, dict):
            return None, "AGENT_RESULT must decode to a JSON object."
        validation_error = validate_agent_result(parsed)
        if validation_error:
            return None, validation_error
        return parsed, None

    match = re.search(rf"{re.escape(AGENT_RESULT_PREFIX)}(.+)$", text, re.MULTILINE)
    if match:
        return None, "AGENT_RESULT must be on its own final line."
    return None, "Missing final AGENT_RESULT line."


def validate_agent_result(result: dict[str, Any]) -> str | None:
    allowed_statuses = {"success", "blocked", "retryable_failure", "non_retryable_failure"}
    allowed_failures = {"context", "tool", "contract", "domain", "approval", "timeout", None}
    allowed_next_types = {"route", "ask_user", "stop"}

    status = result.get("status")
    if status not in allowed_statuses:
        return "AGENT_RESULT status must be one of success, blocked, retryable_failure, non_retryable_failure."

    failure_class = result.get("failureClass")
    if failure_class not in allowed_failures:
        return "AGENT_RESULT failureClass must be one of context, tool, contract, domain, approval, timeout, or null."

    summary = result.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        return "AGENT_RESULT summary must be a non-empty string."

    for key in ("evidence", "artifacts"):
        value = result.get(key)
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            return f"AGENT_RESULT {key} must be an array of strings."

    next_action = result.get("nextAction")
    if not isinstance(next_action, dict):
        return "AGENT_RESULT nextAction must be an object."
    if next_action.get("type") not in allowed_next_types:
        return "AGENT_RESULT nextAction.type must be route, ask_user, or stop."
    target = next_action.get("target")
    if target is not None and not isinstance(target, str):
        return "AGENT_RESULT nextAction.target must be a string or null."

    needs_user_decision = result.get("needsUserDecision")
    if not isinstance(needs_user_decision, bool):
        return "AGENT_RESULT needsUserDecision must be a boolean."

    if status == "success" and failure_class is not None:
        return "AGENT_RESULT failureClass must be null when status is success."
    if status != "success" and failure_class is None:
        return "AGENT_RESULT failureClass must be set for blocked or failure statuses."
    return None
