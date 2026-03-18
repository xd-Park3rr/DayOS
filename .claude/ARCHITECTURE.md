# DayOS Architecture

## Workspace Layout

```text
mobile/
|- .claude/                  Claude guidance, hooks, agents, commands, rules
|- CLAUDE.md                 Primary workspace memory
|- DayOS_ClaudeCode_Manual.md
|- agentlayer-plan.md        Roadmap/spec documents
|- mobile/                    Nested Git repo: Expo / React Native app
|  |- App.tsx
|  |- package.json
|  |- src/
|  |  |- components/
|  |  |- db/
|  |  |- events/
|  |  |- features/
|  |  |- services/
|  |  |- store/
|  |  `- types/
|  `- android/
`- desktop/
   `- FUTURE.MD              Future Tauri direction, not implemented
```

## Repo Boundaries

- The top-level repo tracks `mobile/` as a gitlink. It is not just another folder.
- Workspace-level documentation and Claude configuration live at the top level.
- App implementation, `npm` scripts, Expo config, and TypeScript validation live in `mobile/`.
- When editing app code, treat `mobile/` as its own repo with its own Git status.

## Current App Layers

### Boot And Navigation

- `mobile/App.tsx` runs SQLite migrations, hydrates chat state, starts device services, and mounts the navigation stack.
- Onboarding gates access to the main app screens.
- `JarvisOverlay` and `ToastHost` stay mounted globally.

### Data And State

- `mobile/src/db/client.ts` owns the SQLite connection and schema migrations.
- `mobile/src/db/repositories.ts` centralizes database reads and writes.
- `mobile/src/store/index.ts` uses Zustand for boot state, onboarding state, and persisted chat state.
- `mobile/src/types/index.ts` is the shared app-domain type layer.

### Jarvis / Voice / Intent Stack

- `mobile/src/services/ai/` owns Anthropic messaging, intent parsing, wake word, STT, TTS, and Jarvis session orchestration.
- `jarvisService.ts` coordinates voice session state and bridges UI, STT, intent routing, and spoken replies.
- `osIntentRouter.ts` maps parsed intents to admin actions, summaries, or coach chat.

### Device And Coaching Services

- `mobile/src/services/context/` fuses context signals and simulated context switching.
- `calendar/`, `guard/`, `music/`, `screentime/`, and `sleep/` provide supporting device-aware behavior.
- `mobile/src/events/bus.ts` is the typed in-app event bus used across services.

### UI Layer

- `mobile/src/features/` contains screen-level flows such as onboarding, home, chat, categories, settings, and momentum detail.
- `mobile/src/components/` contains reusable cards, overlays, and UI primitives used by features.
- Styling is currently local `StyleSheet`-based rather than a shared design-system package.

## Roadmap Documents

- `DayOS_ClaudeCode_Manual.md` describes the intended product scope and target architecture.
- `agentlayer-plan.md` describes a later agentic capability layer.
- These documents are planning inputs, not proof that the current app already implements those capabilities.
- If roadmap docs and code disagree, trust the current implementation first and call out the drift explicitly.
