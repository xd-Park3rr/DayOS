#!/usr/bin/env python3
from __future__ import annotations

from common import (
    BLOCKED_FILE_HINTS,
    build_path_policy_context,
    emit_output,
    load_event,
    log_blocked_attempt,
    normalize_repo_path,
    resolve_repo_root,
)


def main() -> None:
    event = load_event()
    repo_root = resolve_repo_root(event)
    tool_input = event.get("tool_input") or {}
    tool_name = str(event.get("tool_name") or "PreToolUse")
    relative_path = normalize_repo_path(
        tool_input.get("file_path") or tool_input.get("path"),
        repo_root,
    )

    if tool_name == "Read" and relative_path in BLOCKED_FILE_HINTS:
        reason = BLOCKED_FILE_HINTS[relative_path]
        log_blocked_attempt(repo_root, tool_name, relative_path, reason)
        emit_output(
            "PreToolUse",
            permission_decision="deny",
            permission_reason=f"{relative_path} is blocked. {reason}",
        )
        return

    context_chunks: list[str] = []
    if relative_path == ".claude/CLAUDE.md":
        context_chunks.append("Primary project memory lives in the repository-root `CLAUDE.md`.")

    if relative_path in {"DayOS_ClaudeCode_Manual.md", "agentlayer-plan.md"}:
        context_chunks.append(
            "These documents are roadmap inputs. If they conflict with `mobile/`, prefer the current implementation and package metadata."
        )

    policy_context = build_path_policy_context(repo_root, relative_path)
    if policy_context:
        context_chunks.append(f"Relevant policy guidance for {relative_path}:\n{policy_context}")

    if context_chunks:
        emit_output("PreToolUse", additional_context="\n\n".join(context_chunks))


if __name__ == "__main__":
    main()
