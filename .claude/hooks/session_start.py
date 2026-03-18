#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from common import emit_output, load_event, resolve_repo_root, runtime_path, tail

AVERAGE_TOKENS_PER_TURN = 900
DEFAULT_CONTEXT_WINDOW = 200_000
COMPACT_WARNING_RATIO = 0.60


def git_status(repo_root: Path) -> str:
    result = subprocess.run(
        ["git", "status", "--short"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if not lines:
        return "clean"
    preview = "; ".join(lines[:5])
    if len(lines) > 5:
        preview = f"{preview}; +{len(lines) - 5} more"
    return preview


def app_root(repo_root: Path) -> Path | None:
    candidate = repo_root / "dayos"
    if candidate.exists() and (candidate / "package.json").exists():
        return candidate
    return None


def load_phase_summary(repo_root: Path) -> str:
    phase_file = repo_root / runtime_path("phase-state.json")
    if not phase_file.exists():
        return "No active phase tracking."
    try:
        data = json.loads(phase_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return "Phase state unreadable."
    return str(data.get("summary") or "Phase state available in .claude/runtime/phase-state.json.")


def extract_token_count(value: object) -> int | None:
    if isinstance(value, dict):
        for key, nested in value.items():
            lowered = str(key).lower()
            if lowered in {
                "total_tokens",
                "totaltokens",
                "token_count",
                "tokencount",
                "estimated_tokens",
                "estimatedtokens",
            } and isinstance(nested, (int, float)):
                return int(nested)
            found = extract_token_count(nested)
            if found is not None:
                return found
    elif isinstance(value, list):
        for item in value:
            found = extract_token_count(item)
            if found is not None:
                return found
    return None


def estimate_context_tokens(event: dict) -> tuple[int | None, str]:
    token_count = extract_token_count(event)
    if token_count is not None:
        return token_count, "token log"

    transcript_path = event.get("transcript_path")
    if isinstance(transcript_path, str) and transcript_path:
        path = Path(transcript_path)
        if path.exists():
            turns = sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
            if turns:
                return turns * AVERAGE_TOKENS_PER_TURN, f"{turns} transcript turns x {AVERAGE_TOKENS_PER_TURN}"

    return None, "estimate unavailable"


def context_window_size() -> int:
    raw_value = os.environ.get("CLAUDE_CONTEXT_WINDOW") or ""
    try:
        return int(raw_value)
    except ValueError:
        return DEFAULT_CONTEXT_WINDOW


def context_pressure_lines(event: dict) -> list[str]:
    estimated_tokens, basis = estimate_context_tokens(event)
    if estimated_tokens is None:
        return [f"- Context estimate: unavailable ({basis})"]

    context_window = context_window_size()
    ratio = estimated_tokens / context_window if context_window else 0
    lines = [
        f"- Context estimate: ~{estimated_tokens} / {context_window} tokens ({ratio:.0%}, basis: {basis})"
    ]
    if ratio >= COMPACT_WARNING_RATIO:
        lines.append("Context window is large; consider compacting before starting another broad task.")
    return lines


def main() -> None:
    event = load_event()
    repo_root = resolve_repo_root(event)
    nested_app = app_root(repo_root)

    context_lines = [
        "Session context:",
        f"- Workspace root: {repo_root}",
        f"- Workspace git status: {git_status(repo_root)}",
        f"- Phase state: {load_phase_summary(repo_root)}",
        "- The top-level repo owns `.claude`, the manuals, and `desktop/`.",
        "- `mobile/` is the primary Expo app and is tracked as a nested Git repo from the workspace root.",
        "- For app code changes, switch to the `mobile/` cwd before running `npm` or TypeScript checks.",
        "- Prefer current code in `mobile/` when it conflicts with `DayOS_ClaudeCode_Manual.md` or `agentlayer-plan.md`.",
        "- Use subagents for broad exploration, independent research, or parallel verification when they add value.",
        f"- Recent runtime errors: {tail(repo_root / runtime_path('errors.log'), 5)}",
        f"- Recent blocked operations: {tail(repo_root / runtime_path('blocked.log'), 3)}",
        f"- Recent agent failures: {tail(repo_root / runtime_path('agent-failures.jsonl'), 3)}",
    ]

    if nested_app is not None:
        context_lines.insert(3, f"- App root: {nested_app}")
        context_lines.insert(4, f"- App git status: {git_status(nested_app)}")

    context_lines.extend(context_pressure_lines(event))
    emit_output("SessionStart", additional_context="\n".join(context_lines))


if __name__ == "__main__":
    main()
