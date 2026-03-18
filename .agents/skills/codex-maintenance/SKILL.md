# Codex Maintenance

Use this skill when editing `AGENTS.md`, `.codex/`, repo skills, Codex subagents, or Codex-facing workspace guidance.

## Contract

- Prefer official OpenAI Codex documentation over assumptions.
- Keep Codex surfaces aligned with the documented model: `AGENTS.md`, `.codex/config.toml`, `.codex/agents/`, `.codex/rules/`, and `.agents/skills/`.
- Reuse the existing DayOS repo truth instead of duplicating instructions across multiple large files.

## Procedure

1. Confirm whether the change belongs in the top-level repo, `mobile/`, or both.
2. Prefer small, layered instructions over one oversized `AGENTS.md`.
3. Keep runtime logs and notification output under `.codex/runtime/`.
4. Translate Claude-only concepts into documented Codex equivalents instead of copying unsupported hook contracts.

## Return

- Files changed.
- Any official-doc assumptions that still matter.
- Verification steps for config, TOML, and instruction-file parseability.
