# Repo Boundaries

- The top-level repo owns `.claude`, `CLAUDE.md`, the planning manuals, and `desktop/`.
- `mobile/` is the nested Git repo and the primary app implementation target.
- Use the top-level cwd for Claude config and workspace docs.
- Use the `mobile/` cwd for app code, `npm` commands, and TypeScript checks.
- Treat `DayOS_ClaudeCode_Manual.md` and `agentlayer-plan.md` as roadmap documents; prefer live code when they disagree.
