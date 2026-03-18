# DayOS — Agentic Layer Manual

> Build specification for the DayOS agentic capability layer — controlled AI access to device systems, messaging, files, and personalisation memory.

| Field | Detail |
|---|---|
| Module | DayOS Agentic Layer (Agent Core) |
| Depends on | DayOS Core (v2.0 manual) — phases 1–8 must be complete |
| Owner | [Your Name] / [Your Company] |
| Document version | 1.0 |
| Status | Ready for Claude Code execution after DayOS Core v2.0 phase 8 |

---

## 1. Purpose & philosophy

This module extends the DayOS Jarvis layer with agentic capabilities — the ability for the AI to read from and act on device systems, messaging platforms, and files on the user's behalf.

The single governing principle of this entire module:

> **The AI proposes. The user disposes. Always.**

The AI can read widely, plan thoroughly, and act precisely — but it never executes any action without showing its reasoning and receiving explicit confirmation. Every step is visible. Every action is logged. Every capability is declared in advance by the user, not discovered at runtime by the AI.

This is not about limiting the AI's intelligence. It is about making the AI's intelligence fully auditable.

### 1.1 What this module adds

- A capability manifest the user controls — declares exactly what the AI can and cannot access
- File system read and write access within declared paths
- Discord message reading and sending with action replay
- WhatsApp conversation reading and sending with action replay
- SMS read access — banking pattern watch, never app access
- Notification stream awareness
- Conversation history access for context building
- An evolving persona memory that personalises Jarvis over time
- An action replay system that shows every step before execution
- A hard block list the AI cannot circumvent under any instruction

### 1.2 What this module does not do

- Access banking apps directly — ever
- Access password managers or 2FA apps
- Execute any write action without user confirmation
- Modify its own capability manifest
- Send data to any cloud service beyond the user's own declared API keys
- Operate outside declared file paths

---

## 2. New files to add to the DayOS project

Add the following to the existing `src/` directory from the core manual. Do not modify existing files unless the integration section specifies it.

```
src/
├── agent/
│   ├── capabilityManifest.ts      # Loads + validates capability_manifest.json
│   ├── actionReplay.ts            # Step recorder + confirmation UI trigger
│   ├── agentLoop.ts               # Multi-step task orchestrator
│   ├── personaMemory.ts           # Reads + writes persona_memory.json
│   └── hardBlockList.ts           # Enforces blocked app/path list — no exceptions
├── capabilities/
│   ├── filesystem/
│   │   └── filesystemCapability.ts
│   ├── messaging/
│   │   ├── discordCapability.ts
│   │   ├── whatsappCapability.ts
│   │   └── smsCapability.ts
│   ├── notifications/
│   │   └── notificationCapability.ts
│   └── contacts/
│       └── contactsCapability.ts
├── features/
│   ├── agentPanel/
│   │   ├── AgentPanelScreen.tsx   # Action replay UI — shows steps + confirm/abort
│   │   └── ActionStepCard.tsx     # Single step card component
│   └── settings/
│       ├── CapabilityManifestEditor.tsx
│       └── PersonaMemoryViewer.tsx
└── config/
    ├── capability_manifest.json   # User-editable — source of truth for all access
    └── persona_memory.json        # AI-writable — evolving user model
```

---

## 3. The capability manifest

The capability manifest is the single source of truth for everything the AI can access. It is a JSON file that lives on-device at `src/config/capability_manifest.json`. The user edits it. The AI reads it on every session start. The AI never writes to it.

### 3.1 Full manifest schema

```json
{
  "version": "1.0",
  "identity": {
    "name": "Jarvis",
    "persona_file": "persona_memory.json",
    "tone": "direct",
    "show_reasoning": true
  },
  "capabilities": {
    "filesystem": {
      "enabled": false,
      "read_paths": [],
      "write_paths": [],
      "blocked_paths": [],
      "max_file_size_mb": 10,
      "allowed_extensions": [".txt", ".md", ".json", ".pdf", ".csv"]
    },
    "messaging": {
      "discord": {
        "enabled": false,
        "can_read_history": false,
        "can_send": false,
        "requires_confirmation": true,
        "confirmation_shows_preview": true,
        "user_token_path": null
      },
      "whatsapp": {
        "enabled": false,
        "can_read_history": false,
        "can_send": false,
        "requires_confirmation": true,
        "confirmation_shows_preview": true
      },
      "sms": {
        "enabled": false,
        "can_read": false,
        "can_send": false,
        "watch_patterns": []
      }
    },
    "notifications": {
      "enabled": false,
      "can_read_stream": false,
      "blocked_app_notifications": []
    },
    "contacts": {
      "enabled": false,
      "can_read": false,
      "can_write": false
    },
    "conversation_history": {
      "enabled": false,
      "sources": [],
      "max_history_days": 30
    }
  },
  "watch_only": {
    "banking_sms_patterns": false,
    "email_subjects": false,
    "notification_stream": false
  },
  "hard_blocked": [
    "com.fnb.banking",
    "com.standardbank.app",
    "com.nedbank.app",
    "com.absa.app",
    "com.capitecbank.app",
    "com.paypal.android",
    "com.google.android.apps.authenticator2",
    "com.authy.authy",
    "com.lastpass.lpandroid",
    "com.onepassword.android",
    "com.dashlane",
    "com.bitwarden.mobile"
  ],
  "action_replay": {
    "enabled": true,
    "require_confirmation_for": ["send", "write", "delete", "modify", "create"],
    "log_all_actions": true,
    "show_ai_reasoning": true,
    "auto_abort_on_hard_block": true
  },
  "persona": {
    "learn_from_interactions": true,
    "update_frequency": "session_end",
    "max_memory_entries": 500,
    "user_can_review": true,
    "user_can_delete_entries": true
  }
}
```

### 3.2 Manifest loading rules

`capabilityManifest.ts` must:

- Load and parse `capability_manifest.json` on every agent session start
- Validate schema — reject and log any malformed manifest, fall back to a zero-capability safe default
- Pass the parsed manifest as a read-only object to the AI system prompt
- Expose a `hasCapability(path: string)` helper used by every capability module before any action
- Never allow runtime modification — manifest changes require app restart to take effect
- Throw immediately if any `hard_blocked` app appears in a requested action target

```ts
// Usage in every capability module before any action
if (!manifest.hasCapability('messaging.discord.can_send')) {
  throw new CapabilityDeniedError('discord.send not declared in manifest')
}
```

### 3.3 Safe default manifest

If `capability_manifest.json` is missing, malformed, or fails validation, the agent falls back to this zero-capability safe default — all capabilities disabled, hard block list active:

```json
{
  "version": "safe_default",
  "capabilities": {},
  "hard_blocked": ["*"],
  "action_replay": { "enabled": true, "log_all_actions": true },
  "watch_only": {}
}
```

---

## 4. The action replay system

The action replay system makes every AI action visible before it executes. It is the trust layer that makes agentic capability feel safe rather than opaque.

### 4.1 How it works

Every capability function emits action steps to `actionReplay.ts` before and after execution. The AgentPanelScreen renders these steps in real time. For any action tagged `requires_confirmation`, execution pauses and waits for explicit user confirmation.

### 4.2 Action step structure

```ts
interface ActionStep {
  id: string
  timestamp: string
  phase: 'reading' | 'reasoning' | 'planning' | 'confirming' | 'executing' | 'done' | 'aborted'
  capability: string           // e.g. 'discord.send', 'filesystem.read'
  description: string          // human-readable: "Reading last 20 Discord messages with user X"
  data?: {
    input?: unknown             // what the AI is working with
    output?: unknown            // what it produced
    preview?: string            // what will be sent/written — shown to user
  }
  requiresConfirmation: boolean
  confirmed?: boolean
  aborted?: boolean
  aiReasoning?: string          // shown when show_reasoning = true
}
```

### 4.3 Replay flow for a Discord send

```
Step 1 — reading
  "Reading conversation history with [username] — last 20 messages"
  [shows last 3 messages as preview]

Step 2 — reasoning  (if show_reasoning = true)
  "User has not responded to the project update sent 2 days ago.
   Tone of prior conversation is professional. Drafting a brief follow-up."

Step 3 — planning
  "Draft message: 'Hey, just following up on the platform update from Tuesday
   — any feedback from your side?'"

Step 4 — confirming  ← PAUSES HERE
  [ActionStepCard shows draft, Send / Edit / Abort buttons]

Step 5 — executing  (only after user taps Send)
  "Sending message to [username] in [channel]"

Step 6 — done
  "Message delivered. Logged to intent_log."
```

The user can abort at any step. If aborted, the action is logged as `aborted` and Jarvis says "Cancelled."

### 4.4 AgentPanelScreen

A modal screen that slides up when any agentic action begins. It shows:

- A live scrollable list of `ActionStepCard` components
- Each step has a phase indicator (coloured dot), description, and optional data preview
- Confirmation steps have `Send` / `Edit` / `Abort` buttons
- "Show reasoning" toggle (reads from manifest)
- Dismiss button — only active when no confirmation is pending

`ActionStepCard` component:

- Phase dot colours: reading = blue, reasoning = purple, planning = amber, confirming = accent green (pulsing), executing = amber, done = gray, aborted = red
- Expandable data preview section — collapsed by default, tap to expand
- Reasoning text shown in muted italic style below description

---

## 5. Data model additions

Add the following tables to the existing SQLite schema via a new migration (v2).

### 5.1 agent_action_log

Permanent record of every action the agent took or attempted.

```sql
id TEXT PRIMARY KEY
session_id TEXT NOT NULL
capability TEXT NOT NULL          -- e.g. 'discord.send'
description TEXT NOT NULL
ai_reasoning TEXT
input_summary TEXT                -- summarised, never raw sensitive data
output_summary TEXT
status TEXT NOT NULL              -- completed | aborted | failed | blocked
confirmed_by_user INTEGER DEFAULT 0
created_at TEXT NOT NULL
```

### 5.2 persona_memory_entry

Individual entries in the evolving user model. Mirrors `persona_memory.json` in SQLite for queryability.

```sql
id TEXT PRIMARY KEY
category TEXT NOT NULL            -- communication_style | pattern | preference | contact | observation
key TEXT NOT NULL
value TEXT NOT NULL
confidence REAL DEFAULT 1.0       -- 0.0–1.0, decays if contradicted
last_observed_at TEXT NOT NULL
observation_count INTEGER DEFAULT 1
created_at TEXT NOT NULL
```

### 5.3 capability_session

Records every agent session — what capabilities were active, what was accessed.

```sql
id TEXT PRIMARY KEY
manifest_version TEXT NOT NULL
capabilities_active TEXT NOT NULL  -- JSON array of active capability keys
started_at TEXT NOT NULL
ended_at TEXT
action_count INTEGER DEFAULT 0
abort_count INTEGER DEFAULT 0
```

---

## 6. Persona memory system

The persona memory is a local, evolving model of the user that Jarvis builds over time. It makes Jarvis feel genuinely personalised rather than generic.

### 6.1 What gets stored

```json
{
  "communication_style": {
    "prefers_brief_replies": true,
    "direct_tone": true,
    "technical_depth": "high",
    "dislikes_small_talk": true
  },
  "observed_patterns": [
    {
      "observation": "Most productive between 09:00 and 13:00",
      "confidence": 0.87,
      "observed_count": 14
    },
    {
      "observation": "Tends to defer admin tasks to evening — often not completed",
      "confidence": 0.72,
      "observed_count": 9
    },
    {
      "observation": "Responds better to factual framing than motivational framing",
      "confidence": 0.91,
      "observed_count": 23
    }
  ],
  "recurring_contacts": [
    {
      "platform": "discord",
      "identifier": "[username]",
      "relationship": "business partner",
      "topics": ["platform decisions", "client work"],
      "last_interaction": "2026-03-15"
    }
  ],
  "preferences": {
    "music_gym": "spotify:playlist:xxx",
    "music_study": "spotify:playlist:yyy",
    "wake_music_default": "spotify:playlist:zzz"
  },
  "decision_patterns": [
    {
      "pattern": "Asks for options before deciding on technical choices",
      "confidence": 0.83
    }
  ]
}
```

### 6.2 How it evolves

`personaMemory.ts` updates the persona file at session end, based on:

- Explicit corrections ("that's wrong, I actually prefer X") — high confidence update, immediate
- Observed behaviour patterns — incremental confidence increase per consistent observation
- Contradicted patterns — confidence decay, eventually removed if confidence drops below 0.2
- User reviews via `PersonaMemoryViewer.tsx` — can delete any entry manually

### 6.3 How it reaches the AI

On every session start, `personaMemory.ts` builds a compact persona summary (under 400 tokens) and injects it into the system prompt:

```
USER PERSONA (learned from interaction history):
- Communication: direct, brief, technical depth high, dislikes small talk
- Productive window: 09:00–13:00 (high confidence)
- Responds to: factual framing over motivational framing
- Known contacts: [business partner] on Discord — discuss platform/client topics
- Preferences: gym = [playlist], study = [playlist]
```

The AI uses this to shape every response — not just agent actions, but coach messages, consequence framing, and wake sequence tone.

### 6.4 Privacy rules for persona memory

- Persona memory is stored locally only — never transmitted
- The AI can write observations to persona memory but cannot read raw conversation content from the memory file
- Contact names are stored as relationship labels only — full names never written to persona file
- User can view, edit, and delete all persona entries via `PersonaMemoryViewer.tsx`
- A "reset persona" option clears all entries and starts fresh

---

## 7. Capability implementations

### 7.1 File system

**Permission required:** `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (Android) or document picker entitlement (iOS)

**Implementation rules:**

- All file operations routed through `filesystemCapability.ts`
- Check `hasCapability('filesystem.read_paths')` and verify requested path is within declared paths before any read
- Check `hasCapability('filesystem.write_paths')` before any write
- Check `hard_blocked` path list before any operation
- File content is summarised before passing to AI — never raw binary, never more than 10,000 characters of text per file
- Write operations shown in action replay with full content preview before execution

```ts
async function readFile(path: string): Promise<string> {
  checkNotHardBlocked(path)
  checkPathAllowed(path, manifest.capabilities.filesystem.read_paths)
  emitActionStep({ phase: 'reading', description: `Reading ${path}` })
  const content = await fs.readFile(path, 'utf8')
  return truncateForAI(content, 10000)
}
```

### 7.2 Discord

**Method:** Discord REST API with user token (not bot token — this acts as the user)

**Permissions required:** None on Android/iOS — uses HTTP calls only

**User token:** Stored in `expo-secure-store` under key `discord_user_token`. Never in manifest, never in plain SQLite.

**Implementation:**

```ts
// Read history
GET https://discord.com/api/v10/channels/{channel_id}/messages?limit=20
Authorization: {user_token}

// Send message
POST https://discord.com/api/v10/channels/{channel_id}/messages
Authorization: {user_token}
{ "content": "message text" }
```

**Action replay steps for send:**
1. Reading — fetch last N messages, show preview of conversation
2. Reasoning — AI explains why this message, in this tone
3. Planning — show draft message
4. Confirming — pause, show Send / Edit / Abort
5. Executing — only after confirmation
6. Done — log to `agent_action_log`

**Important note on Discord user tokens:** Using a user token to automate Discord actions is against Discord's Terms of Service for bots, but is a grey area for personal automation. Since DayOS is a personal tool running locally with your own token, the risk is low — but the user should be aware. Include this note in the settings screen for the Discord capability.

### 7.3 WhatsApp

**Method:** WhatsApp has no official API for personal accounts. Two options:

**Option A — WhatsApp Business API** (if user has a Business account): Full REST API, clean integration, requires Meta developer account.

**Option B — Accessibility Service bridge** (personal account): Use `AccessibilityService` to read WhatsApp messages from the notification stream and open WhatsApp with pre-filled message via Intent. Less capable but works with standard accounts.

```ts
// Open WhatsApp with pre-filled message via Intent
Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`)
```

With option B, Jarvis composes the message and opens WhatsApp with it pre-filled. The user still taps Send manually. This is a softer integration — Jarvis assists, the user executes. This is actually the safer default for WhatsApp.

**Recommendation:** Implement option B first (works for everyone), add option A as a configurable upgrade for business account holders.

### 7.4 SMS

**Permissions required:** `READ_SMS` (Android). iOS does not expose SMS to third-party apps — SMS access is Android-only.

**Read implementation:**

```ts
// Read SMS from specific senders
import SmsAndroid from 'react-native-get-sms-android'

SmsAndroid.list(
  JSON.stringify({ box: 'inbox', maxCount: 50 }),
  (fail) => console.error(fail),
  (count, smsList) => {
    const messages = JSON.parse(smsList)
    // Filter by watch_patterns from manifest
    // Summarise for AI — never pass raw message content
  }
)
```

**Banking watch mode:**

The AI never sees full SMS content from financial senders. `smsCapability.ts` filters messages from known banking sender IDs, extracts only:
- Transaction type (debit/credit detected by keyword)
- Relative amount range (not exact — "large transaction" vs "small transaction")
- Whether it looks like a balance notification, OTP, or transaction alert
- Timestamp

Exact amounts, account numbers, and OTP codes are stripped before the summary reaches the AI. This gives Jarvis situational awareness ("3 banking notifications today, one looks like a large debit") without exposing sensitive financial data.

**OTP hard rule:** Any SMS matching OTP patterns (6-digit codes, "your code is", "verification code", "OTP") is immediately discarded — never passed to AI, never logged. This is enforced in `hardBlockList.ts` with a regex pattern list, not configurable by user.

### 7.5 Notification stream

**Android:** `NotificationListenerService` — requires user to grant notification access in system settings.

**iOS:** Notifications can only be read when the app is in the foreground or via background notification handling — no persistent listener available.

**Implementation:**

```ts
// Register NotificationListenerService in AndroidManifest.xml
// Receive notification events in notificationCapability.ts

onNotificationPosted(notification) {
  const packageName = notification.packageName
  // Check hard_blocked list first
  if (hardBlockList.includes(packageName)) return
  // Check if blocked in manifest notification blocklist
  if (manifest.capabilities.notifications.blocked_app_notifications.includes(packageName)) return
  // Store summarised notification (app name + category, not full content) in context buffer
}
```

The notification stream gives the AI ambient awareness — "you have 3 unread WhatsApp messages and a new email from an unknown sender" — without reading the full content of each notification.

---

## 8. Agent loop — multi-step task orchestration

The agent loop is what makes complex multi-step tasks possible. It allows the AI to plan a sequence of actions, execute them one by one, check results, and adapt — all with full visibility via the action replay system.

### 8.1 When the agent loop activates

The agent loop activates when `intentService.ts` classifies an intent as `agent.task` — a multi-step task that requires more than one capability call. Single-step intents (send one message, read one file) go through the normal intent routing. Multi-step tasks (rearrange my week, summarise all my Discord conversations with X and draft a reply, find the file I saved about the client last week and send it to my business partner) go through the agent loop.

### 8.2 Agent loop flow

```
1. User issues command via voice or chat
2. intentService classifies as agent.task
3. agentLoop.ts calls aiService.planAgentTask(command, manifest, context)
4. AI returns a task plan — ordered list of steps with capability calls
5. Show plan to user in AgentPanelScreen: "Here's what I'll do — confirm to start"
6. User confirms plan
7. Execute steps in sequence:
   a. Emit ActionStep for current step
   b. Check capability permission
   c. Check hard block list
   d. Execute capability call
   e. If requires_confirmation: pause, show step, wait for confirm
   f. On confirm: execute, log to agent_action_log
   g. On abort: stop loop, mark remaining steps as aborted
   h. Pass result to next step context
8. On completion: summarise what was done, speak via TTS
```

### 8.3 Task plan structure

```ts
interface AgentTaskPlan {
  taskDescription: string
  estimatedSteps: number
  steps: AgentTaskStep[]
  requiresConfirmationAt: number[]  // step indices that need user confirmation
}

interface AgentTaskStep {
  stepNumber: number
  description: string
  capability: string
  params: Record<string, unknown>
  dependsOnStep?: number           // result of previous step feeds into this one
  canAbortAfterThis: boolean       // whether aborting here leaves clean state
}
```

### 8.4 Task planning AI prompt

```
You are planning a multi-step task for the user. You have access to the following 
declared capabilities: {activeCapabilities}

Task: {userCommand}
Current context: {contextSnapshot}

Return ONLY valid JSON matching the AgentTaskPlan schema.
Rules:
- Only use capabilities declared in the manifest
- Never include any hard_blocked apps or paths
- Mark every write/send step as requiring confirmation
- Keep plans to 10 steps maximum — ask user to break down larger tasks
- If the task cannot be completed with available capabilities, return a plan 
  with a single step of type "capability_gap" explaining what is missing
```

---

## 9. CapabilityManifestEditor screen

A settings screen that gives the user a clean UI to edit their manifest without touching JSON directly.

### 9.1 Layout

- Section per capability group: File System, Messaging, Watch Only, Hard Block List, Action Replay, Persona
- Each capability has a toggle (enabled/disabled)
- Expanded view shows sub-options (read paths, send permission, confirmation requirement)
- Hard block list shows as a chip list — user can add/remove apps
- "Export manifest" button — saves current manifest as a shareable JSON file
- "Import manifest" button — loads a manifest from a JSON file
- "Reset to safe defaults" button — nuclear option, disables everything

### 9.2 Path editor for file system

- Visual path picker — browse device directories
- Add/remove paths to read_paths and write_paths separately
- Hard-blocked paths shown in red — cannot be added to any permitted list
- Warning shown if write_paths overlap with system directories

### 9.3 Validation

On every manifest edit, validate immediately and show inline errors. Do not allow saving an invalid manifest. Common validation rules:

- write_paths must be a subset of or equal to read_paths
- No hard_blocked path can appear in read_paths or write_paths
- No hard_blocked app can appear in any messaging capability
- `allowed_extensions` must all start with `.`

---

## 10. PersonaMemoryViewer screen

A transparent window into what Jarvis has learned about the user.

### 10.1 Layout

- Grouped sections matching persona_memory.json structure: Communication style, Observed patterns, Recurring contacts, Preferences, Decision patterns
- Each entry shows: observation text, confidence bar (0–100%), observation count, last seen date
- Swipe left to delete any entry
- "Reset all persona memory" button with confirmation dialog
- Export button — saves persona_memory.json as a readable file

### 10.2 Confidence bar colours

- 0–40%: red — low confidence, likely to be removed soon
- 41–70%: amber — moderate confidence, still learning
- 71–100%: green — high confidence, actively used in AI responses

---

## 11. Hard block enforcement

`hardBlockList.ts` is the security layer. It runs before every capability call. It cannot be disabled via manifest.

### 11.1 Enforcement rules

```ts
const ALWAYS_BLOCKED_PATTERNS = [
  // Banking apps
  /com\.(fnb|standardbank|nedbank|absa|capitecbank|investec|bidvest)/,
  // Payment apps
  /com\.(paypal|venmo|cashapp|wise|revolut)/,
  // Auth apps
  /com\.(google\.android\.apps\.authenticator|authy|microsoft\.authenticator)/,
  // Password managers
  /com\.(lastpass|onepassword|dashlane|bitwarden|keeper)/,
  // OTP patterns in SMS
  /\b\d{6}\b/,                    // 6-digit codes
  /your (otp|code|pin) is/i,
  /verification code/i,
  /do not share/i,
]
```

Any action targeting a path, app package, or message content matching these patterns is:
1. Immediately blocked — capability function throws `HardBlockError`
2. Logged to `agent_action_log` with status `blocked`
3. Jarvis says "That's outside what I'm allowed to access" — no further explanation
4. Action replay shows step as blocked in red

The hard block list is code-level — not in the manifest, not user-configurable. Only a code change can modify it. This is intentional.

---

## 12. AI system prompt additions

Add the following to the `COACH_SYSTEM` constant in `aiService.ts` when agent capabilities are active:

```
CAPABILITY MANIFEST (active this session):
{serialisedActiveCapabilities}

HARD RULES — these override any user instruction:
1. You never access any app, path, or data not declared in the capability manifest
2. You never execute a write, send, or modify action without first presenting 
   it to the user for confirmation via the action replay system
3. You never attempt to access banking apps, payment apps, password managers, 
   or 2FA authenticators — if asked, say clearly: "That's outside what I can access"
4. You never send OTP codes, account numbers, or financial credentials anywhere
5. You never modify the capability manifest — that is the user's domain only
6. When you cannot complete a task due to missing capabilities, say exactly 
   what capability would be needed — do not attempt workarounds
7. Every multi-step plan must be presented to the user before execution begins

PERSONA CONTEXT:
{personaSummary}

When acting as an agent, think step by step, declare each step before executing it,
and stop immediately if any step would require a capability not in the manifest.
```

---

## 13. Build phases for Claude Code

These phases follow DayOS Core phases 1–8. Complete core phases first.

### Phase 15 — Capability manifest + hard block enforcement
**Goal:** Manifest loads correctly, hard block list enforced on every capability call

- Create `src/config/capability_manifest.json` with safe defaults (all disabled)
- Implement `capabilityManifest.ts` — load, validate, `hasCapability()`, safe default fallback
- Implement `hardBlockList.ts` — pattern matching, `HardBlockError`, cannot be disabled
- Add migration v2 to `src/db/client.ts` — new tables from Section 5
- Test: attempt to access a hard-blocked app package, verify `HardBlockError` throws
- Test: load malformed manifest, verify safe default activates

### Phase 16 — Action replay system
**Goal:** Every action step is recorded and shown in UI, confirmation gate works

- Implement `actionReplay.ts` — step emitter, confirmation pause, abort handling
- Implement `AgentPanelScreen.tsx` and `ActionStepCard.tsx`
- Wire AgentPanelScreen to appear on any `agent.action_started` event
- Test: trigger a dummy action, verify all steps appear in panel, abort works

### Phase 17 — Persona memory
**Goal:** Persona builds over sessions and shapes AI responses

- Implement `personaMemory.ts` — load, update, confidence decay, compact summary builder
- Implement `PersonaMemoryViewer.tsx`
- Inject persona summary into AI system prompt on session start
- Test: add manual observation, verify it appears in viewer and in next session's system prompt

### Phase 18 — File system capability
**Goal:** AI can read and write files within declared paths

- Implement `filesystemCapability.ts`
- Add File System section to `CapabilityManifestEditor.tsx`
- Wire to agent intent routing for `filesystem.read` and `filesystem.write` intents
- Test: declare a read path, ask Jarvis to read a file in it, verify action replay shows content preview before confirmation

### Phase 19 — Discord capability
**Goal:** Jarvis can read Discord history and send messages with full action replay

- Implement `discordCapability.ts` — REST calls with user token
- Store user token in `expo-secure-store`
- Wire to agent intent routing
- Test: enable Discord in manifest, ask "Message [username] on Discord to check on the project", verify full action replay with draft preview before send

### Phase 20 — SMS capability + banking watch
**Goal:** SMS readable, banking patterns surfaced safely, OTPs hard-blocked

- Implement `smsCapability.ts` — read, pattern filter, banking summariser
- OTP pattern blocking enforced before any SMS content reaches AI
- Watch mode surfaced in morning briefing context
- Test: receive a mock banking SMS, verify AI receives only categorised summary not raw content, verify OTP pattern is stripped

### Phase 21 — WhatsApp capability
**Goal:** WhatsApp messages composable via Intent bridge

- Implement `whatsappCapability.ts` — option B (Intent bridge) first
- Wire to agent intent routing
- Test: ask Jarvis to draft a WhatsApp message, verify pre-filled Intent opens WhatsApp

### Phase 22 — Notification stream
**Goal:** Ambient notification awareness without exposing content

- Implement `notificationCapability.ts` — NotificationListenerService
- Wire to context snapshot so AI knows notification state
- Test: receive notification from non-blocked app, verify AI receives app name and category only

### Phase 23 — Agent loop
**Goal:** Multi-step tasks execute with full plan visibility

- Implement `agentLoop.ts`
- Implement `aiService.planAgentTask()`
- Wire multi-step intent detection in `intentService.ts`
- Test: issue a 3-step task ("find the file about X and send it to my business partner on Discord"), verify full plan shown before execution, each step confirmed individually

### Phase 24 — CapabilityManifestEditor
**Goal:** User can configure all capabilities via clean UI without editing JSON

- Implement `CapabilityManifestEditor.tsx`
- Add to settings navigation
- Test: toggle Discord capability on, verify manifest updates, restart session, verify capability active

---

## 14. Key constraints for Claude Code

### 14.1 Security constraints

- `hardBlockList.ts` enforcement runs before EVERY capability call — no exceptions, no bypasses
- OTP patterns in SMS are stripped before any processing — in code, not in manifest
- User token for Discord stored ONLY in `expo-secure-store` — never in SQLite, never in manifest
- Persona memory NEVER contains full contact names, account numbers, or message content
- Agent action log summaries are sanitised before writing — no raw sensitive content in logs

### 14.2 Architecture constraints

- `capabilityManifest.ts` is read-only to all agent code — no runtime writes
- `personaMemory.ts` is the only module that writes to `persona_memory.json`
- `hardBlockList.ts` is the only module that defines blocked patterns — never inline checks
- All capability modules must call `hasCapability()` before every operation
- `agentLoop.ts` must present the full plan before executing any step

### 14.3 Confirmation constraints

- Any action in `action_replay.require_confirmation_for` MUST pause and show preview
- Confirmation timeout: if user does not respond in 60 seconds, auto-abort
- No confirmation can be bypassed via voice command — "yes do it without asking" is not valid
- Edit option on confirmation must allow user to modify the action before confirming

### 14.4 Build constraints

- Complete phases in order — agent loop (23) requires all capabilities (18–22)
- Test hard block enforcement explicitly after every phase
- Never store API keys or user tokens in `capability_manifest.json`
- All new tables use migration v2 — never modify migration v1

---

## 15. Testing checkpoints

| Phase | Checkpoint |
|---|---|
| 15 | Manifest loads, safe default activates on bad JSON, HardBlockError throws on blocked package |
| 16 | Dummy action shows all steps in AgentPanel, abort at any step works, log written |
| 17 | Persona observation added, appears in viewer, injected into next session system prompt |
| 18 | File in declared path readable with action replay preview, file outside path throws |
| 19 | Discord message drafted, full preview shown in action replay, send only after confirmation |
| 20 | Banking SMS summarised without raw content reaching AI, OTP stripped before processing |
| 21 | WhatsApp Intent opens with pre-filled message, user still taps send manually |
| 22 | Notification received, AI knows app name and count only — no message content |
| 23 | 3-step task planned and shown upfront, each step confirmed individually, abort mid-plan leaves clean state |
| 24 | Manifest editor toggles capability, manifest file updates, session restart reflects change |

---

## 16. Environment additions

Add to `.env`:

```bash
# Agentic layer additions
EXPO_PUBLIC_DISCORD_USER_TOKEN=    # stored in expo-secure-store at runtime, not here
```

Discord user token is collected via a settings screen input and stored directly to `expo-secure-store`. It never touches `.env`, the manifest, or SQLite. The settings screen should include a clear explanation of what the token is and how to obtain it, with a warning about Discord ToS for automation.

---

## 17. Future capability modules

These are not in scope for v1 but the architecture supports them as community-contributed modules:

| Module | Capability added |
|---|---|
| Email (Gmail API) | Read email subjects + senders, draft replies |
| Notion API | Read and write Notion pages and databases |
| GitHub API | Read issues, PRs, create comments |
| Home Assistant | Full home automation action capability |
| Health anomaly alerts | Proactive alerts on health metric thresholds |
| Caregiver mode | Escalation paths for elderly/health monitoring use cases |
| Google Drive | Read and write documents within declared folders |

Each module follows the same pattern: declare in manifest, check `hasCapability()`, emit action steps, require confirmation on writes.

---

*DayOS Agentic Layer v1.0 — [Your Name] / [Your Company] — All rights reserved*