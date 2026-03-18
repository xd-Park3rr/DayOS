# DayOS Workspace AGENTS

## Workspace Map

- The top-level repo owns `.claude/`, `.codex/`, `AGENTS.md`, `CLAUDE.md`, the planning manuals, and `desktop/`.
- `mobile/` is a nested Git repository and the primary Expo / React Native app.
- Treat `mobile/` as its own repo for Git status, validation, and app-local Codex configuration.
- `desktop/` is still planning-only; do not describe it as implemented software.

## Instruction Priority

- Prefer live code over `DayOS_ClaudeCode_Manual.md` and `agentlayer-plan.md` when they disagree.
- Treat roadmap manuals as planning inputs, not proof that a feature already exists.
- Treat `.codex/runtime/` and `.claude/runtime/` as transient state, never as source guidance.

## Working Directories

- Use the top-level cwd for workspace docs, `.claude`, `.codex`, `AGENTS.md`, and cross-repo comparison work.
- Use the `mobile/` cwd for app code, `npm` commands, Expo checks, and TypeScript validation.
- If a task crosses both repos, keep the boundary explicit in the answer and in any commands you run.

## Token Discipline

- Load only the repo skill that matches the task instead of broad instructions.
- Prefer one specialized subagent per independent slice over broad fan-out.
- Prefer read-only explorers, reviewers, or researchers before a write-capable worker.
- Keep answers concise and evidence-driven.
- Do not enable Fast mode or any speed-oriented service tier in this workspace.

## Skill Routing

- Use `workspace-explorer` for repo discovery, entrypoint mapping, and boundary checks.
- Use `manual-drift-review` when comparing roadmap docs against current code.
- Use `codex-maintenance` when editing `.codex`, `AGENTS.md`, or Codex-facing repo guidance.
- Use `mobile-feature` for Expo / React Native feature work from the top-level repo.
- Use `voice-stack` for wake word, STT, TTS, microphone, permission, or native integration tasks.
- Use `data-state` for SQLite, repositories, Zustand, or schedule/state alignment work.
- Use `mobile-tests` for focused app validation or test-writing work.
- Use `release-check` for app or workspace readiness checks.

## Subagent Routing

- Use `workspace-explorer` for read-only repo exploration and file discovery.
- Use `manual-drift-reviewer` for roadmap-vs-code audits.
- Use `mobile-architect` for DayOS app design or refactor planning.
- Use `voice-stack-researcher` for native-module, Expo, React Native, or docs research.
- Use `release-guardian` for release-readiness and validation checklists.
- Use `codex-maintainer` for `.codex`, AGENTS, skills, and rules maintenance.

## OpenAI / Codex Guidance

- For Codex or OpenAI product questions, use the official OpenAI developer docs MCP first.
- If MCP is unavailable, browse only official OpenAI domains.
- Keep Codex configuration aligned to documented surfaces: `AGENTS.md`, `.codex/config.toml`, `.codex/agents/`, `.codex/rules/`, and `.agents/skills/`.
- Do not invent Claude-style hook contracts inside Codex; use documented notification, rules, skills, and agent config instead.

## Validation And Evidence

- Run checks from the repo that owns the code being changed.
- Cite the files that prove the current behavior.
- Call out drift explicitly when manuals overstate implementation.
