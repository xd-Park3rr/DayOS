---
description: Investigate wake word, STT, TTS, permissions, or other native voice-path issues in DayOS.
---

# investigate-voice-stack

Use this for work involving Jarvis voice capture or playback.

Workflow:
1. Inspect `mobile/package.json` for installed native modules.
2. Read the relevant files in `mobile/src/services/ai/` and permission helpers.
3. Separate implemented code, mocked behavior, and unsupported platform assumptions.
4. Research third-party constraints only after inspecting current wiring.

Output:
- current voice path summary
- likely failure point or missing integration
- recommended fix or next diagnostic step
