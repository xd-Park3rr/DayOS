# DayOS App AGENTS

## Repo Scope

- You are inside the actual Expo / React Native app repo.
- Favor app-local code and validation over workspace-level planning docs.
- If the manuals say more than the code implements, state the drift instead of assuming the roadmap is already shipped.

## Key Entry Points

- `App.tsx` boots migrations, hydrates stores, starts services, mounts navigation, and keeps the Jarvis overlay and toast host mounted.
- `src/db/` owns SQLite schema, migrations, and repository code.
- `src/store/index.ts` owns Zustand state.
- `src/services/ai/` owns Anthropic calls, intent routing, wake word, STT, TTS, and Jarvis orchestration.
- `src/features/` and `src/components/` own the mobile UI.

## App Conventions

- Keep raw SQL in `src/db/`.
- Keep shared UI state in `src/store/index.ts` unless a new store is clearly warranted.
- Keep device side effects and OS integration in services, not screen components.
- Preserve the current `StyleSheet`-driven visual language unless the task calls for redesign.
- Confirm native-module assumptions from `package.json` before changing the voice stack.

## Validation

- Prefer `npx tsc --noEmit --project tsconfig.json` from `mobile/` for TypeScript validation.
- If a task touches native voice or permissions, inspect both `package.json` and the affected `src/services/ai/` path.
- Keep repo scope explicit in answers when a change also touches the top-level workspace.

## Skill Routing

- Use `mobile-feature` for ordinary feature work.
- Use `voice-stack` for wake word, STT, TTS, microphone, permissions, or native integration work.
- Use `data-state` for SQLite, repositories, Zustand, and schedule/state changes.
- Use `mobile-tests` for focused tests or validation helpers.
- Use `release-check` for app readiness and release verification.

## Subagent Routing

- Use `repo-explorer` for read-only file discovery.
- Use `mobile-architect` for design or refactor planning.
- Use `feature-implementer` for scoped app implementation slices.
- Use `voice-stack-researcher` for native or docs research.
- Use `test-writer` for one focused validation slice at a time.
- Use `release-guardian` for release-readiness checks.
