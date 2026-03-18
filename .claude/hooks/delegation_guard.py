#!/usr/bin/env python3
from __future__ import annotations

from common import emit_output, load_event

SUBAGENT_BLOCKED_TOOLS = {"Task", "Agent"}


def classify_execution_context(event: dict) -> bool:
    agent_id = event.get("agent_id")
    if isinstance(agent_id, str) and agent_id.strip():
        return True

    transcript_path = event.get("transcript_path")
    if not isinstance(transcript_path, str) or not transcript_path.strip():
        return False

    normalized_path = transcript_path.replace("\\", "/")
    return "/subagents/" in normalized_path


def main() -> None:
    event = load_event()
    tool_name = str(event.get("tool_name") or "")
    in_subagent = classify_execution_context(event)

    if in_subagent and tool_name in SUBAGENT_BLOCKED_TOOLS:
        emit_output(
            "PreToolUse",
            permission_decision="deny",
            permission_reason=(
                f"Subagents may not use {tool_name}. "
                "Handle nested delegation from the main session instead."
            ),
        )
        return

    emit_output("PreToolUse")


if __name__ == "__main__":
    main()
