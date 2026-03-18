# DayOS Task Prompts

## Explore The Workspace

When the request is broad or ambiguous:
1. Confirm whether the task targets the top-level workspace, the nested `mobile/` app, or both.
2. Read the current code before leaning on the manuals.
3. Call out any drift between `DayOS_ClaudeCode_Manual.md`, `agentlayer-plan.md`, and implemented code in `mobile/`.
4. Use a subagent only when broad exploration or parallel research will materially help.

## Implement A Mobile Feature

When adding or changing app behavior:
1. Start from the active screen, service, store, or repository entrypoint in `mobile/`.
2. Trace all affected layers: UI, store, services, database, and event bus.
3. Keep navigation changes aligned with `mobile/App.tsx`.
4. Validate from `mobile/` with a TypeScript check when possible.

## Debug Voice Or Native Integration

When the task involves wake word, STT, TTS, or device integration:
1. Read `mobile/package.json` to confirm the installed native modules.
2. Inspect the relevant service files in `mobile/src/services/ai/` and any dependent permission or context services.
3. Check for fallback behavior before changing the happy path.
4. Distinguish clearly between code that is implemented, mocked, or still aspirational.

## Change Data, State, Or Scheduling

When modifying SQLite, Zustand, or daily schedule behavior:
1. Start in `mobile/src/db/client.ts`, `mobile/src/db/repositories.ts`, `mobile/src/store/index.ts`, and `mobile/src/types/index.ts`.
2. Keep schema, repository mappings, and UI/store expectations aligned.
3. Use services and the event bus for side effects rather than adding DB writes directly inside screens.

## Review Manual Drift

When asked whether the repo matches the spec:
1. Compare the requested section of the manual against live code in `mobile/`.
2. Separate implemented behavior, partial scaffolding, and unimplemented roadmap items.
3. Cite the files that prove the current behavior.
