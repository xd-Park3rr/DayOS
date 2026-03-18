# Workspace Explorer

Use this skill for broad DayOS workspace exploration, repo boundary checks, or entrypoint discovery before implementation.

## Scope

- The top-level repo owns `.claude/`, `.codex/`, `AGENTS.md`, the planning manuals, and `desktop/`.
- `mobile/` is a nested Git repo and the primary Expo / React Native app.

## Procedure

1. Confirm whether the task targets the top-level repo, `mobile/`, or both.
2. Start with file discovery before opening large docs.
3. Identify the smallest set of files that prove the current behavior.
4. If manuals are involved, call out where they drift from the implemented code.

## Return

- Relevant files and why they matter.
- Current implementation status.
- Open questions or next slices worth delegating.
