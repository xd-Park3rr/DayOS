#!/usr/bin/env python3
from __future__ import annotations

import re

from common import emit_output, load_event

DESTRUCTIVE_PATTERNS = [
    (re.compile(r"(?i)\bgit\s+reset\s+--hard\b"), "Use non-destructive git inspection instead of `git reset --hard`."),
    (re.compile(r"(?i)\bgit\s+checkout\s+--\b"), "Use targeted edits instead of discarding changes with `git checkout --`."),
    (re.compile(r"(?i)\bgit\s+clean\s+-fd\b"), "`git clean -fd` is blocked in this repository."),
    (re.compile(r"(?i)\brm\s+-rf\b"), "Recursive force deletion is blocked in this repository."),
    (re.compile(r"(?i)\bRemove-Item\b.*-Recurse.*-Force"), "Recursive force deletion is blocked in this repository."),
]


def main() -> None:
    event = load_event()
    tool_input = event.get("tool_input") or {}
    command = str(tool_input.get("command") or "")

    for pattern, reason in DESTRUCTIVE_PATTERNS:
        if pattern.search(command):
            emit_output("PreToolUse", permission_decision="deny", permission_reason=reason)
            return


if __name__ == "__main__":
    main()
