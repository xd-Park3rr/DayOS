# Voice And Intents

- Start with the current voice path in `mobile/src/services/ai/` before changing native dependencies.
- Keep wake word, STT, intent routing, and TTS responsibilities separated even when one feature spans them.
- Preserve fallback behavior when a native module, permission, or API key is unavailable.
- Distinguish between implemented device behavior and mocked or placeholder logic.
- When changing intent behavior, verify both the router and the downstream admin or coach action.
