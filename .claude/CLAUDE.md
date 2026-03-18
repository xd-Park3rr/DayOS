# Project Memory Redirect

Primary project memory lives in the repository-root `CLAUDE.md`.

- The top-level repo owns `.claude/`, the manuals, and `desktop/`.
- `mobile/` is the nested Git repo that contains the Expo mobile app.
- Use the top-level cwd for workspace docs and Claude configuration.
- Use the `mobile/` cwd for app code, `npm` commands, and validation.

Keep `.claude/ARCHITECTURE.md`, `.claude/CONVENTIONS.md`, and `.claude/PROMPTS.md` as source documents. Reference them selectively instead of copying them wholesale into prompts.
