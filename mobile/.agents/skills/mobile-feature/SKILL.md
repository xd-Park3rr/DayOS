# Mobile Feature

Use this skill for ordinary DayOS app feature work.

## Procedure

1. Start from the active screen, component, service, store, or repository entrypoint.
2. Trace all affected layers: UI, store, services, database, event bus, and native integration.
3. Keep navigation changes aligned with `App.tsx`.
4. Keep app side effects in services, not in screen components.

## Validation

- Prefer `npx tsc --noEmit --project tsconfig.json` when possible.

## Return

- Files changed or proposed.
- Behavior changes and edge cases.
- Validation results or blockers.
