# DayOS Workspace Memory

DayOS is a two-repo workspace.

- The top-level repository owns `.claude/`, the planning manuals, and `desktop/`.
- `mobile/` is a nested Git repository and the primary coding target. It contains the Expo / React Native app.
- Use the top-level cwd for `.claude` edits, repo documentation, and workspace-level review.
- Use the `mobile/` cwd for app code, `npm` commands, and TypeScript validation.

## Source Of Truth

- Treat current code in `mobile/` as the source of truth for implemented behavior.
- Treat `DayOS_ClaudeCode_Manual.md` and `agentlayer-plan.md` as roadmap/spec documents.
- If the manuals disagree with the current app, prefer `mobile/package.json`, `mobile/App.tsx`, and the live `mobile/src/` implementation.

## Current App Shape

- `mobile/App.tsx` boots migrations, hydrates chat state, starts monitoring services, and mounts navigation plus the Jarvis overlay.
- `mobile/src/db/` owns SQLite access and repositories.
- `mobile/src/store/index.ts` owns Zustand state for app boot, onboarding, and chat history.
- `mobile/src/services/ai/` owns Anthropic calls, intent routing, wake word, STT, TTS, and Jarvis session orchestration.
- `mobile/src/services/context/`, `calendar/`, `guard/`, `music/`, `screentime/`, and `sleep/` own supporting device and coaching behavior.
- `mobile/src/features/` and `mobile/src/components/` provide the mobile UI.

## Working Guidance

- Keep repo scope explicit when editing: top-level docs and hooks are separate from app code in `mobile/`.
- Keep `.claude/runtime/` as transient state only. Do not treat logs or run-state files as source guidance.
- Use subagents when the task benefits from broad repo exploration, external research, or parallel verification. They are optional, not mandatory.
- Preserve current app conventions unless the task explicitly asks for a redesign or architectural change.
