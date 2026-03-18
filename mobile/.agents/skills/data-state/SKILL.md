# Data State

Use this skill for SQLite schema work, repository changes, Zustand updates, and schedule or hydration logic.

## Procedure

1. Start in `src/db/client.ts`, `src/db/repositories.ts`, `src/store/index.ts`, and `src/types/index.ts`.
2. Keep schema, repository mappings, and UI expectations aligned.
3. Keep raw SQL inside `src/db/`.
4. Use services and the event bus for cross-layer side effects rather than putting persistence logic inside screens.

## Return

- The affected schema, repository, store, and UI surfaces.
- Any migration or hydration implications.
- Validation or regression risks.
