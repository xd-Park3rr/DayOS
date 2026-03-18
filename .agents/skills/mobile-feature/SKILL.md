# Mobile Feature

Use this skill for ordinary DayOS app feature work from either the top-level repo or the nested `mobile/` repo.

## Procedure

1. Start from the active screen, component, service, store, or repository entrypoint.
2. Trace all affected layers: UI, store, services, database, event bus, and native integration.
3. Keep navigation changes aligned with `mobile/App.tsx`.
4. Keep app-side effects in services, not in screen components.

## Validation

- Run app validation from `mobile/`.
- Prefer `npx tsc --noEmit --project tsconfig.json` when possible.

## Return

- Files changed or proposed.
- Behavior changes and edge cases.
- Validation results or blockers.
