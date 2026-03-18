# DayOS Coding Conventions

## Working Directory

- Edit top-level files only when you are changing `.claude`, workspace docs, or wrapper-repo metadata.
- Edit app code from `mobile/`.
- Run `npm` and TypeScript validation from `mobile/`, not the workspace root.

## TypeScript And React Native

- Keep TypeScript strict and avoid `any` unless there is no workable narrowing path.
- Use `type` for unions and utility compositions; use `interface` for object shapes shared across the app domain.
- Match the current import style in `mobile/`: relative imports without forced `.js` extensions.
- Default exports are acceptable only where the repo already uses them, such as `App.tsx`. Prefer named exports elsewhere.

## Naming And File Layout

- Screens and components use `PascalCase.tsx`.
- Services, repositories, and helpers use `camelCase.ts`.
- Keep shared domain types in `mobile/src/types/index.ts` unless the type is narrowly local.
- Keep database access in `mobile/src/db/`; do not spread raw SQL through feature files.

## State, Events, And Side Effects

- Zustand stores in `mobile/src/store/index.ts` are the source of UI state.
- SQLite migrations and persistence logic belong in `mobile/src/db/`.
- Cross-service app events belong on the typed bus in `mobile/src/events/bus.ts`.
- Device or OS side effects belong in services, not inside screen components.

## UI And Styling

- Preserve the current visual language unless the task explicitly calls for a redesign.
- Prefer local `StyleSheet.create` styles and current font usage over introducing a new styling system.
- Keep navigation changes aligned with `mobile/App.tsx`.
- Favor mobile-first layouts and avoid web-only assumptions.

## Errors And Logging

- Keep log output contextual with a stable prefix such as `[Jarvis]`, `[Intent Router]`, or `[App Store]`.
- User-facing failures should degrade to a safe fallback message instead of crashing the app.
- When a native capability is optional or flaky, preserve the current fallback path and surface the limitation clearly.

## Validation

- For app code changes, prefer a `tsc --noEmit` check from `mobile/`.
- When a change touches native voice or device integrations, inspect both the service code and `mobile/package.json` before assuming a module is wired correctly.
- Compare roadmap documents against current code before claiming a feature already exists.
