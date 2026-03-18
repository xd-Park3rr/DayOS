# Data And State

- SQLite schema changes start in `mobile/src/db/client.ts` and must stay aligned with `mobile/src/db/repositories.ts` and `mobile/src/types/index.ts`.
- Keep raw SQL inside `mobile/src/db/`, not inside screens or generic services.
- Zustand store updates belong in `mobile/src/store/index.ts` unless a new store is clearly warranted.
- Use the typed event bus for cross-service reactions instead of ad hoc global coupling.
- When changing scheduling or status flows, verify repository mappings, store hydration, and UI assumptions together.
