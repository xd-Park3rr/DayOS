#!/usr/bin/env python3
from __future__ import annotations

import re

from common import emit_output, load_event

SIGNALS = [
    (
        r"\b(wake ?word|porcupine|whisper|stt|tts|elevenlabs|microphone|voice)\b",
        "Inspect `mobile/package.json` and `mobile/src/services/ai/` before assuming the native voice stack is already wired correctly.",
    ),
    (
        r"\b(sqlite|migration|schema|repository|repositories|zustand|store|chat history|drift)\b",
        "Check `mobile/src/db/`, `mobile/src/store/index.ts`, and `mobile/src/types/index.ts` so schema, mappings, and UI state stay aligned.",
    ),
    (
        r"\b(screen|ui|component|layout|navigation|home screen|chat screen|onboarding)\b",
        "Read the target screen or component plus `mobile/App.tsx` and `mobile/src/constants/index.ts`; preserve the existing mobile UI language unless asked to redesign it.",
    ),
    (
        r"\b(manual|spec|roadmap|agent layer|architecture)\b",
        "Treat `DayOS_ClaudeCode_Manual.md` and `agentlayer-plan.md` as roadmap documents; compare them against live code in `mobile/` before planning edits.",
    ),
    (
        r"\b(\.claude|hook|slash command|subagent|agent)\b",
        "Use the root `CLAUDE.md` as the entrypoint and keep `.claude/runtime/` artifacts separate from source guidance.",
    ),
]


def main() -> None:
    event = load_event()
    prompt = str(event.get("prompt") or "")
    for pattern, message in SIGNALS:
        if re.search(pattern, prompt, re.IGNORECASE):
            emit_output("UserPromptSubmit", additional_context=f"DayOS guidance: {message}")
            return


if __name__ == "__main__":
    main()
