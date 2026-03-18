# DayOS — Claude Code Instructions Manual

> A complete build specification for Claude Code to scaffold, implement, and iterate on the DayOS personal life orchestrator — an ambient AI layer that manages, coaches, and speaks to the user across their entire day.

| Field | Detail |
|---|---|
| Project | DayOS — Personal Life Orchestrator + Ambient AI (Jarvis layer) |
| Owner | [Your Name] / [Your Company] |
| Stack | React Native (Expo bare) + TypeScript + SQLite |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Voice in | Picovoice Porcupine (wake word) + Whisper (STT) |
| Voice out | ElevenLabs TTS |
| Document version | 2.0 |
| Status | Ready for Claude Code execution |

---

## 1. Purpose & project overview

DayOS is a cross-platform mobile application (React Native / Expo) that acts as a full ambient AI layer on top of the user's phone. It is not just a coaching app — it is a persistent, voice-activated life orchestrator that knows the user's context at all times, speaks to them proactively, manages their schedule, enforces their goals, and integrates with every major app and OS signal on their device.

The closest analogy is Jarvis from Iron Man — an ambient intelligence that is always present, always aware, and acts only in the user's genuine long-term interest.

This document is a complete set of instructions for Claude Code to build the application from scratch. Each section describes what to build, why it exists, and the exact technical approach to follow. **Claude Code should read this document fully before writing any code.**

> **Core philosophy:** This app is a coach and an orchestrator. Every design decision must serve the user's long-term goals, not engagement metrics. The app should need the user less over time, not more. It speaks when it has something useful to say — not to be heard.

### 1.1 What the app does

- Pulls the user's schedule from Google Calendar via MCP and builds a structured daily timeline
- Listens for a custom wake word ("Hey Jarvis" or any trained phrase) and activates on voice command
- Converts speech to text on-device and routes intent to the correct action
- Speaks back to the user via high-quality TTS — in the car, on waking, at the gym
- Detects context automatically via Bluetooth device connections, location, motion, and phone state
- Triggers activity logs automatically when context is detected — no manual check-in required
- Fires a personalised wake-up sequence at the user's designated wake time using sleep tracker data
- Suggests and plays music via Spotify based on detected context
- Tracks screen time across apps and escalates from soft nudge to hard OS-level block
- Maintains a private on-device diary with AI-safe context extraction (themes only, never raw text)
- Writes to calendar, reminders, tasks, and contacts on the user's behalf via voice or chat
- Enforces user-defined guard rules with a layer the AI cannot override

### 1.2 What it is not

- Not a gamified to-do app — no points, no streaks as goals, no guilt-tripping
- Not a surveillance tool — all personal data stays on-device, no raw data sent to cloud
- Not an engagement-optimised product — success means the user needs it less over time
- Not always talking — Jarvis speaks with purpose, not volume

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Framework | React Native with Expo (bare workflow — required for native modules) |
| Language | TypeScript (strict mode, ESM) |
| Navigation | @react-navigation/native + native-stack |
| State management | Zustand |
| Local database | expo-sqlite (SQLite, AES-256 encrypted) |
| Secure storage | expo-secure-store (Secure Enclave / Android Keystore) |
| AI chat + reasoning | Anthropic API — claude-sonnet-4-20250514 |
| Wake word detection | Picovoice Porcupine — react-native-porcupine |
| Speech to text | Whisper on-device — react-native-whisper |
| Text to speech | ElevenLabs API — fetch-based, played via expo-av |
| Calendar | Google Calendar MCP connector + expo-calendar |
| Sleep data | Health Connect API (Android) / HealthKit (iOS) |
| Bluetooth context | react-native-bluetooth-classic + BluetoothAdapter broadcasts |
| Music | Spotify SDK — react-native-spotify-remote |
| Screen time (Android) | react-native-usage-stats (UsageStatsManager + AccessibilityService) |
| Screen time (iOS) | FamilyControls / ManagedSettings (Apple entitlement required) |
| Admin app writes | Android Intents + ContentProviders / iOS URL schemes + Shortcuts |
| Background tasks | expo-background-fetch + expo-task-manager |
| Notifications | expo-notifications |
| Location | expo-location (geofenced context detection) |
| Package manager | npm |

> **Bare workflow is required.** The Jarvis layer needs native modules (Porcupine, Whisper, Bluetooth, Health Connect) unavailable in managed workflow. Run `npx expo prebuild` after initial setup. All native modules must be linked manually.

> **TypeScript strictness:** Enable `strict: true` in `tsconfig.json`. All types live in `src/types/index.ts`. No `type: any` anywhere.

---

## 3. Project structure

```
mobile/
├── App.tsx                        # Entry point — bootstrap + routing
├── app.json                       # Expo config
├── tsconfig.json
├── .env                           # All API keys — never commit
└── src/
    ├── types/
    │   └── index.ts               # ALL TypeScript interfaces
    ├── db/
    │   ├── client.ts              # SQLite connection + migration runner
    │   └── repositories.ts        # All DB operations — no raw SQL outside here
    ├── events/
    │   └── bus.ts                 # Typed event bus singleton + emit helpers
    ├── services/
    │   ├── ai/
    │   │   └── aiService.ts       # Anthropic API + context snapshot builder
    │   ├── jarvis/
    │   │   ├── wakeWordService.ts  # Porcupine wake word — Foreground Service
    │   │   ├── sttService.ts       # Whisper on-device speech-to-text
    │   │   ├── ttsService.ts       # ElevenLabs TTS + expo-av playback
    │   │   ├── intentService.ts    # Intent classification + action routing
    │   │   └── wakeSequence.ts     # Morning wake-up sequence orchestrator
    │   ├── context/
    │   │   ├── bluetoothContext.ts # BT device → context mapping
    │   │   ├── locationContext.ts  # Geo-fenced context detection
    │   │   └── contextEngine.ts    # Fuses all signals into inferred state
    │   ├── sleep/
    │   │   └── sleepService.ts     # Health Connect / HealthKit polling
    │   ├── music/
    │   │   └── musicService.ts     # Spotify SDK + context-aware suggestions
    │   ├── admin/
    │   │   └── adminService.ts     # Calendar writes, reminders, contacts, tasks
    │   ├── guard/
    │   │   └── consequenceEngine.ts
    │   ├── calendar/
    │   │   └── calendarService.ts
    │   └── screentime/
    │       └── screentimeService.ts
    ├── store/
    │   └── index.ts               # Zustand: app, chat, onboarding, jarvis
    ├── features/
    │   ├── onboarding/
    │   │   └── OnboardingFlow.tsx
    │   ├── home/
    │   │   └── HomeScreen.tsx
    │   ├── chat/
    │   │   └── ChatScreen.tsx
    │   ├── categories/
    │   │   └── CategoryEditor.tsx
    │   └── settings/
    │       ├── BluetoothMappingScreen.tsx
    │       └── WakeWordScreen.tsx
    ├── components/
    │   ├── ActivityBlock.tsx
    │   ├── CoachBanner.tsx
    │   ├── DriftBar.tsx
    │   ├── ConsequenceCard.tsx
    │   └── JarvisOverlay.tsx      # Fullscreen overlay shown on activation
    ├── constants/
    │   └── index.ts               # Colours, severity config, default copy
    └── utils/
        └── index.ts               # Date helpers, ID generation, sanitiseForSpeech()
```

---

## 4. Data model

All data lives in SQLite on-device. Schema created via migration runner on boot.

### 4.1 user_profile

```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
onboarding_complete INTEGER DEFAULT 0
coach_tone TEXT DEFAULT 'direct'        -- direct | firm | supportive
jarvis_name TEXT DEFAULT 'Jarvis'       -- display label only, not used for detection
elevenlabs_voice_id TEXT                -- chosen TTS voice
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

### 4.2 category_config

```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
colour TEXT NOT NULL
default_severity TEXT NOT NULL          -- critical | high | medium | low
identity_anchor TEXT NOT NULL
screen_time_allowed INTEGER DEFAULT 0
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

### 4.3 activity

```sql
id TEXT PRIMARY KEY
category_id TEXT REFERENCES category_config(id)
title TEXT NOT NULL
severity TEXT NOT NULL
identity_anchor TEXT NOT NULL
real_cost_message TEXT NOT NULL
recurrence TEXT DEFAULT 'weekly'        -- once | daily | weekly | custom
recurrence_days TEXT                    -- JSON array e.g. [1,3,5]
window_minutes INTEGER DEFAULT 60
default_time TEXT                       -- HH:MM
rationalisation_threshold INTEGER DEFAULT 2
calendar_event_id TEXT
bluetooth_trigger_id TEXT               -- FK to bluetooth_device_map
is_active INTEGER DEFAULT 1
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

### 4.4 activity_log

```sql
id TEXT PRIMARY KEY
activity_id TEXT REFERENCES activity(id)
scheduled_at TEXT NOT NULL
completed_at TEXT
status TEXT DEFAULT 'pending'           -- pending | done | skipped | deferred
skip_reason TEXT
trigger_source TEXT DEFAULT 'manual'   -- manual | bluetooth | location | schedule
rationalisation_flagged INTEGER DEFAULT 0
created_at TEXT NOT NULL
```

### 4.5 drift_state

```sql
id TEXT PRIMARY KEY
activity_id TEXT UNIQUE REFERENCES activity(id)
misses_this_week INTEGER DEFAULT 0
misses_this_month INTEGER DEFAULT 0
last_completed_at TEXT
drift_score INTEGER DEFAULT 0           -- 0–100. +15 per miss, -10 per completion
escalation_level INTEGER DEFAULT 1      -- 1 | 2 | 3
updated_at TEXT NOT NULL
```

### 4.6 consequence_record

```sql
id TEXT PRIMARY KEY
activity_id TEXT REFERENCES activity(id)
triggered_at TEXT NOT NULL
type TEXT NOT NULL                      -- mirror | drift | replan
message_delivered TEXT NOT NULL
user_response TEXT DEFAULT 'pending'    -- pending | acknowledged | dismissed | snoozed
created_at TEXT NOT NULL
```

### 4.7 diary_entry

```sql
id TEXT PRIMARY KEY
content TEXT NOT NULL                   -- encrypted, NEVER sent to AI
themes TEXT DEFAULT '[]'               -- JSON string[], extracted locally only
created_at TEXT NOT NULL
```

### 4.8 bluetooth_device_map

Maps paired Bluetooth devices to context labels and linked activities.

```sql
id TEXT PRIMARY KEY
device_name TEXT NOT NULL              -- e.g. "JBL Clip 4"
device_address TEXT NOT NULL           -- MAC address — stored locally only, never transmitted
context_label TEXT NOT NULL            -- gym | commute | focus | sleep_prep
activity_id TEXT REFERENCES activity(id)   -- auto-trigger on connect
music_playlist_uri TEXT                -- Spotify URI to auto-play
jarvis_greeting TEXT                   -- spoken on context change
auto_dnd INTEGER DEFAULT 0             -- enable Do Not Disturb on connect
created_at TEXT NOT NULL
```

### 4.9 context_state

Current inferred context. Single row, constantly overwritten.

```sql
id TEXT PRIMARY KEY DEFAULT 'current'
label TEXT NOT NULL DEFAULT 'default'  -- gym | commute | focus | waking | sleep_prep | default
source TEXT NOT NULL                   -- bluetooth | location | schedule | manual
detected_at TEXT NOT NULL
bluetooth_device_id TEXT
location_label TEXT
```

### 4.10 sleep_record

Sleep data pulled from Health Connect / HealthKit each morning.

```sql
id TEXT PRIMARY KEY
date TEXT NOT NULL                     -- YYYY-MM-DD
duration_minutes INTEGER
quality_score INTEGER                  -- 0–100
sleep_start TEXT                       -- ISO datetime — stored locally only
sleep_end TEXT                         -- ISO datetime — stored locally only
deep_minutes INTEGER
rem_minutes INTEGER
wake_triggered INTEGER DEFAULT 0       -- 1 after wake sequence fires (prevents repeat)
created_at TEXT NOT NULL
```

### 4.11 intent_log

Every voice command and resolution — for debugging and pattern learning.

```sql
id TEXT PRIMARY KEY
raw_text TEXT NOT NULL                 -- Whisper transcript
intent_class TEXT NOT NULL
action_taken TEXT
success INTEGER DEFAULT 1
created_at TEXT NOT NULL
```

> **Privacy rule:** `diary_entry.content` and `sleep_record` raw timestamps NEVER leave the device. The AI receives only diary themes and a sleep score + duration summary. Bluetooth MAC addresses are stored locally only, never transmitted. Enforced at the repository layer — no exceptions.

---

## 5. Event bus

All services communicate through a single typed event bus. No service calls another directly.

### 5.1 Full event type list

| Event type | Published by |
|---|---|
| `schedule.updated` | calendarService |
| `usage.threshold` | screentimeService — 80% of limit |
| `usage.exceeded` | screentimeService — 100% of limit |
| `reminder.due` | scheduler |
| `activity.completed` | user action or auto-trigger |
| `activity.skipped` | user action |
| `activity.deferred` | user action |
| `activity.auto_started` | contextEngine on BT or location match |
| `drift.escalated` | consequenceEngine |
| `guard.triggered` | guardLayer |
| `day.started` | scheduler — first app open each day |
| `day.ended` | scheduler — 22:00 or sleep prep detected |
| `context.updated` | contextEngine — data refresh |
| `context.changed` | contextEngine — label transition (e.g. default → gym) |
| `bluetooth.connected` | bluetoothContext |
| `bluetooth.disconnected` | bluetoothContext |
| `wake_word.detected` | wakeWordService |
| `jarvis.activated` | intentService — STT ready |
| `jarvis.speaking` | ttsService — TTS output started |
| `jarvis.idle` | ttsService — TTS finished |
| `wake_sequence.triggered` | sleepService |
| `music.requested` | intentService or wakeSequence |
| `onboarding.complete` | OnboardingFlow |

---

## 6. AI service

### 6.1 Context snapshot

The context snapshot is all the AI ever receives. Built by `buildContextSnapshot()` in `aiService.ts` on every API call.

Must include:
- Category names, identity anchors, severity defaults
- Today's activity blocks with status and scheduled times
- Drift summary per category (score + escalation level)
- Current context label (e.g. `gym`, `commute`)
- Last night's sleep summary — score and duration only, no raw timestamps
- Diary themes from last 7 days — themes only, never raw text
- Last 5 consequence records

Must NEVER include: raw diary content, sleep timestamps, contact names, calendar event descriptions, location coordinates, or any raw private text.

### 6.2 API call requirements

- Model: `claude-sonnet-4-20250514`
- All calls include no-training header
- API key from `EXPO_PUBLIC_ANTHROPIC_API_KEY`
- All calls wrapped in try/catch — failures degrade gracefully, never crash UI
- Max tokens: 1000 chat, 400 nudges/TTS responses, 2000 onboarding payload
- TTS responses must be under 80 words — Jarvis does not monologue

### 6.3 AI functions to implement

| Function | Purpose |
|---|---|
| `chat(userMessage, history)` | Main coach chat with full context |
| `generateMorningBriefing()` | 3-sentence spoken morning brief |
| `generateWakeSequence(sleepData)` | Full wake-up spoken script — see Section 9 |
| `generateContextGreeting(contextLabel)` | Short spoken greeting on BT context change |
| `generateConsequenceMessage(activityId)` | Called on skip at escalation level 2+ |
| `generateRationalisationChallenge(activityId, reason)` | One hard question before skip accepted |
| `classifyIntent(transcript)` | Classifies voice command into intent + params JSON |
| `generateAdminConfirmation(action, params)` | Spoken confirmation before writing to external app |
| `onboardingTurn(history, isLastTurn)` | Onboarding conversation |
| `parseOnboardingPayload(raw)` | Parse JSON from onboarding final turn |

### 6.4 Coach tone guidelines

Embed in `COACH_SYSTEM` constant. Apply to all calls except `classifyIntent`:

- Direct, brief, factual — under 60 words unless asked for detail
- States facts, does not moralise
- Connects every message to the user's identity anchor
- Never thanks the user for engaging
- Never uses emoji
- TTS responses must sound natural when spoken — no markdown, no lists, no bullet points
- All AI content going to TTS must pass through `sanitiseForSpeech()` in `utils/index.ts` which strips all markdown formatting

### 6.5 Intent classification

`classifyIntent(transcript)` must return ONLY valid JSON. Fall back to `coach.chat` on parse failure.

```json
{
  "intent": "calendar.create | calendar.update | calendar.query | reminder.create | contact.lookup | schedule.query | activity.checkin | screentime.block | music.play | coach.chat | drift.query | system.status",
  "params": {
    "title": "string or null",
    "datetime": "ISO string or null",
    "duration": "minutes or null",
    "target": "app name or null",
    "query": "string or null"
  },
  "confidence": 0.0
}
```

---

## 7. Guard layer & consequence engine

### 7.1 Rule types

| Type | Behaviour |
|---|---|
| Hard rule | 24-hour cool-down before modification. AI has read-only access. Triggers OS-level block. |
| Soft rule | User can override with friction. Interstitial + 10-minute snooze. |

### 7.2 Escalation logic

| Level | Skips this week | Response |
|---|---|---|
| 1 | 1 | No consequence — too early |
| 2 | 2 | Mirror message — identity reflection |
| 3 | 3+ | Drift report + replan prompt |

### 7.3 Rationalisation detector

Fires when:
- Activity marked done in under 60 seconds without time block being active
- Same activity skipped twice in one week with different stated reasons
- Reminder dismissed within 2 seconds (saw-and-ignored pattern)

Response: full-screen interstitial with one AI challenge question. Must tap "Override anyway" — not just dismiss.

---

## 8. Jarvis — ambient AI voice layer

The Jarvis layer is the ambient intelligence core. Runs as a persistent background service, listens for the wake word, processes voice commands, and speaks proactively when context changes or events fire.

### 8.1 Wake word — Picovoice Porcupine

**Library:** `react-native-porcupine`

**Setup flow:**
1. During onboarding user chooses their wake phrase
2. Download matching `.ppn` model file from console.picovoice.ai (free personal tier — 25 spoken repetitions, ~10 minutes)
3. Bundle `.ppn` file in `src/assets/wake/`
4. `wakeWordService.ts` starts `PorcupineManager` on app launch
5. Manager listens on mic at low power using device DSP — no cloud, ~1–3% battery/hour
6. On detection: emit `wake_word.detected`, start `sttService.ts` 5-second recording window
7. On STT complete: emit `jarvis.activated` with transcript
8. Pass transcript to `intentService.ts` for classification and routing

**Android requirement:** Porcupine must run in a Foreground Service that survives app backgrounding. Use a persistent notification (required Android 8+). The wake word service and Bluetooth receiver share the same Foreground Service.

**iOS requirement:** Declare background audio mode in `app.json` Info.plist. Background mic access requires Always-On Audio entitlement in some iOS versions — test carefully.

**Important:** `jarvis_name` in `user_profile` is a display label only. The actual detection is handled entirely by the `.ppn` model file — the two are independent.

### 8.2 Speech to text — Whisper

**Library:** `react-native-whisper` (runs whisper.cpp on-device)

**Model:** `whisper-tiny.en` or `whisper-base.en` — download on first launch, cache to device storage.

**Flow:**
- Record up to 5 seconds after wake word, or until 1.5 seconds of silence detected
- Transcribe fully on-device — no audio ever sent to cloud
- On failure or empty result: Jarvis says "I didn't catch that" via TTS, returns to idle
- Log all transcripts to `intent_log`

### 8.3 Text to speech — ElevenLabs

Direct fetch to ElevenLabs API — no SDK required.

```ts
async function speak(text: string): Promise<void> {
  // Always sanitise first
  const clean = sanitiseForSpeech(text)

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: clean,
        model_id: 'eleven_turbo_v2',    // lowest latency
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  )
  const buffer = await response.arrayBuffer()
  // Write buffer to temp file, play via expo-av
  emit.jarvisSpeaking()
  // On playback end:
  emit.jarvisIdle()
}
```

Emit `jarvis.speaking` before playback, `jarvis.idle` when finished. No Jarvis action fires while already speaking — always check `jarvis.speaking` state first.

**Offline fallback:** Use `expo-speech` (Android/iOS system TTS) when ElevenLabs is unreachable.

**Voice onboarding:** Play 3 ElevenLabs voice samples during onboarding Screen 3, user picks one, store `elevenlabs_voice_id` in `user_profile`.

### 8.4 Intent routing

`intentService.ts` receives a classified intent object and routes it:

| Intent class | Routed to | Notes |
|---|---|---|
| `calendar.create` | adminService.createCalendarEvent() | Requires confirmation |
| `calendar.update` | adminService.updateCalendarEvent() | Requires confirmation |
| `calendar.query` | calendarService.queryToday() → TTS | Read only — no confirmation needed |
| `reminder.create` | adminService.createReminder() | Requires confirmation |
| `contact.lookup` | adminService.lookupContact() → TTS | Read only |
| `schedule.query` | aiService.chat() with schedule context | Read only |
| `activity.checkin` | activityRepo.markDone() + emit activity.completed | No confirmation — user-initiated |
| `screentime.block` | screentimeService.blockApp() | Requires confirmation |
| `music.play` | musicService.playContextPlaylist() | No confirmation |
| `drift.query` | aiService.chat() with drift context | Read only |
| `coach.chat` | aiService.chat() → TTS response | Read only |
| `system.status` | contextEngine.getStatus() → TTS | Read only |

**Confirmation pattern for all write actions:**
1. `aiService.generateAdminConfirmation()` produces spoken confirmation sentence
2. Speak via TTS
3. Listen 5 seconds for "yes" / "confirm" / "do it"
4. On positive: execute action
5. On "no" / "cancel" / silence: say "Cancelled", abort
6. Never execute a write without hearing confirmation — no exceptions

### 8.5 JarvisOverlay component

Fullscreen Modal rendered above all screens on `wake_word.detected` or proactive Jarvis speech:

- Dark background, 95% opacity
- Pulsing accent green orb at centre (CSS keyframe animation, `transform` and `opacity` only)
- Transcribed text appears as Whisper processes
- Jarvis response appears as text while TTS plays
- Dismiss on tap or automatically when `jarvis.idle` fires
- Must use React Native `Modal` with `transparent={true}` and `animationType="fade"`

---

## 9. Wake-up sequence

The most important daily touchpoint. Fires once per day at the user's target wake time.

### 9.1 Trigger logic

`sleepService.ts` polls Health Connect / HealthKit every 5 minutes starting 30 minutes before target wake time. Fires `wake_sequence.triggered` when:
- Tracker reports user in light sleep phase within wake window, OR
- Target wake time reached regardless of sleep phase

Fires once per day only. Set `wake_triggered = 1` in `sleep_record` immediately after firing.

### 9.2 Wake sequence flow

```
1. wake_sequence.triggered fires
2. wakeSequence.ts calls aiService.generateWakeSequence(sleepData)
3. AI generates spoken script (see prompt below)
4. ttsService.ts speaks the script
5. After script ends, Jarvis says: "What do you want on?"
6. Listen for voice response via sttService (8 second window)
7. Route music intent to musicService
8. If no response in 8 seconds: play context-default playlist silently
9. Emit day.started
```

### 9.3 Wake sequence AI prompt

```
Generate a wake-up briefing. Rules:
- Start with the time and a one-word sleep quality assessment (e.g. "7:14. Decent.")
- State the single most important thing today — one sentence
- If any activity is at drift escalation level 3, mention it once, factually
- End with exactly: "What do you want on?"
- Maximum 4 sentences total
- No pleasantries, no "good morning", no emoji
- Must sound natural when spoken aloud — no markdown, no lists

Sleep data: {score}/100, {duration} hours
Today's critical items: {criticalActivities}
Current drift alerts: {driftAlerts}
```

### 9.4 Sleep data integration

**Android:** `react-native-health-connect`. Request `SleepSessionRecord` permission. Compatible with Samsung Health, Fitbit, Garmin, Oura, and most major trackers that write to Health Connect.

**iOS:** `react-native-health`. Request `HKCategoryTypeIdentifierSleepAnalysis`.

**What to read:** Duration, sleep stages if available, quality score if provided by source app.

**What the AI receives:** Duration in minutes and quality score (0–100) only. Raw timestamps stored locally, never transmitted.

---

## 10. Bluetooth context engine

### 10.1 How it works

`bluetoothContext.ts` registers a broadcast receiver for `ACTION_ACL_CONNECTED` and `ACTION_ACL_DISCONNECTED`. On every connection event it checks the device name and MAC against `bluetooth_device_map`. On match:

1. Update `context_state` with matched label
2. Emit `bluetooth.connected` and `context.changed`
3. Auto-start linked activity log (emit `activity.auto_started`)
4. Speak context greeting via Jarvis TTS
5. Start linked Spotify playlist if URI is set
6. Enable Do Not Disturb if `auto_dnd = 1`

On disconnection from a mapped device:
1. Revert `context_state` to `default`
2. Close any open auto-started activity log (mark as done if window elapsed, else deferred)
3. Emit `bluetooth.disconnected` and `context.changed`

### 10.2 Context labels

| Label | Typical trigger | Jarvis behaviour | Auto actions |
|---|---|---|---|
| `gym` | Gym speaker connected | "Session started. [playlist] on." | Start training log, play playlist, block social |
| `commute` | Car stereo connected | Reads today's agenda hands-free | Car mode, voice-only, read blocks aloud |
| `focus` | Desk speaker / home earbuds | "Focus mode." | Block distracting apps, Pomodoro on request |
| `sleep_prep` | Home speaker at 22:00+ | "Winding down." | Block stimulating apps, silence nudges |
| `default` | No mapped device | Silent | Normal behaviour |

### 10.3 BluetoothMappingScreen

Settings screen in `src/features/settings/BluetoothMappingScreen.tsx`:

- Lists all paired Bluetooth devices from the OS
- For each: assign context label, linked activity, Spotify playlist URI, greeting text, DND toggle
- "Test" button plays greeting via TTS immediately
- All changes persist to `bluetooth_device_map` in SQLite instantly

### 10.4 Android implementation

Requires `BLUETOOTH_CONNECT` permission (Android 12+) and `BLUETOOTH` for older versions. Register broadcast receiver inside the Foreground Service alongside wake word listener. Both share one persistent notification to minimise OS overhead.

---

## 11. Admin integrations — writing to external apps

The AI and voice layer can write to the following on the user's behalf. All writes require an explicit spoken confirmation before execution.

### 11.1 Google Calendar

Use `expo-calendar` for on-device calendar access. Also maintain the MCP connector for richer management.

```ts
await Calendar.createEventAsync(calendarId, {
  title, startDate, endDate, location, notes, alarms,
})

await Calendar.updateEventAsync(eventId, { title, startDate, endDate })
```

### 11.2 Reminders and tasks

**Android:** `react-native-alarm-manager` for system reminders. Google Tasks REST API (OAuth) for task creation.

**iOS:** `expo-calendar` with reminder calendar type for iOS Reminders. URL schemes for third-party task apps:
- Todoist: `todoist://addtask?content=...`
- Things 3: `things:///add?title=...`

### 11.3 Contacts

Read via `expo-contacts`. Write (add/update) requires `WRITE_CONTACTS` permission. Use only on explicit voice command — never proactively.

### 11.4 Android Intents

```ts
import { Linking } from 'react-native'
Linking.openURL('https://tasks.google.com/tasks/new?title=...')
```

For apps with no public API, use `AccessibilityService` to simulate UI. Requires `BIND_ACCESSIBILITY_SERVICE` permission and explicit user consent. Use sparingly.

### 11.5 iOS Shortcuts bridge

```ts
Linking.openURL('shortcuts://run-shortcut?name=AddToNotion&input=...')
```

User creates named Shortcuts during setup. DayOS provides a setup guide listing all recommended Shortcuts.

### 11.6 Confirmation requirement — enforced in intentService.ts

```
1. AI generates confirmation sentence
2. Speak via TTS: "Adding BJJ to Thursday at 5pm — confirm?"
3. Listen 5 seconds
4. "yes" / "confirm" / "do it" → execute
5. "no" / "cancel" / silence → say "Cancelled", abort
6. Never execute a write without confirmation — no exceptions
```

---

## 12. Music integration

### 12.1 Spotify SDK

`react-native-spotify-remote`. Requires Spotify Premium and a registered Spotify Developer app.

Capabilities: play playlist by URI, play track, queue, get current track, pause/resume/skip.

### 12.2 Context-aware playlist mapping

Each `bluetooth_device_map` entry stores a `music_playlist_uri`. On context change, `musicService.ts` auto-plays if set. User maps their own Spotify playlist URIs in `BluetoothMappingScreen`.

### 12.3 Wake-up music flow

After wake sequence script ends, Jarvis asks "What do you want on?" and listens 8 seconds:

- Genre name ("Afrobeats", "hip hop") → search Spotify and play top result
- Playlist name ("my workout playlist") → find in user's Spotify library
- "Anything" or no response → play context-default playlist
- "Nothing" / "quiet" → skip music, continue silently

All music intent parsing handled in `intentService.ts`.

---

## 13. Onboarding flow

Three screens. Must feel like a conversation, not a form.

### 13.1 Screen 1 — area selection

- Chips: University/school, My own business, Martial arts/sport, Job/employer, Creative work, Parenting, Health recovery, Personal growth, Side projects, Relationships, Finance, Other
- Minimum 1 required, CTA disabled until selected

### 13.2 Screen 2 — AI conversation

- Chat UI matching main chat screen visually
- First message auto-sent on mount based on selected areas
- After 3 user messages, trigger final JSON payload turn
- Parse with `parseOnboardingPayload()` — retry once on failure
- On success: display coach summary sentence, navigate to Screen 3

### 13.3 Screen 3 — category confirmation + Jarvis setup

- Inferred category cards (editable: name, identity anchor)
- Wake word setup section:
  - Text showing default name "Jarvis" with edit option
  - Note explaining user must train their `.ppn` file on console.picovoice.ai
  - Direct link to Picovoice Console
- Voice selection: 3 ElevenLabs sample buttons (play each), user selects one
- CTA: "This is me — let's go"
- On confirm: seed all tables, mark onboarding complete, emit `onboarding.complete`

### 13.4 Onboarding JSON payload

```json
{
  "categories": [{
    "name": "string",
    "colour": "hex string",
    "defaultSeverity": "critical | high | medium | low",
    "identityAnchor": "string",
    "screenTimeAllowed": "boolean"
  }],
  "suggestedActivities": [{
    "title": "string",
    "severity": "critical | high | medium | low",
    "identityAnchor": "string",
    "realCostMessage": "string",
    "recurrence": "weekly | daily | once | custom",
    "recurrenceDays": "number[] | null",
    "windowMinutes": "number",
    "defaultTime": "HH:MM | null",
    "rationalisationThreshold": "number",
    "isActive": true
  }],
  "coachTone": "direct | firm | supportive",
  "summary": "string"
}
```

---

## 14. Home screen

### 14.1 Layout

1. Header: greeting + date + current context badge + avatar
2. Coach banner: morning briefing, green left-border accent, tapping opens ChatScreen
3. "Today's blocks" section label
4. Timeline: scrollable ActivityBlock list
5. "Momentum" section label
6. Drift row: 3 DriftBar components
7. Coach input bar: "Ask your coach anything…" — tap opens ChatScreen, hold activates Jarvis voice

### 14.2 Context badge

Small pill in the header showing current context label. Colours: gym = amber, commute = blue, focus = teal, sleep_prep = purple, default = gray. Tapping opens context detail sheet showing active BT device and triggered actions.

### 14.3 ActivityBlock component

Shows: time, severity dot, title, category + duration, leave-by time, severity badge, trigger source icon (BT icon if auto-started via Bluetooth). Tapping opens detail sheet with mark-done / skip / defer.

| Severity | Dot colour | Badge |
|---|---|---|
| Critical | `#f27a7a` | Red tint |
| High | `#f2b97a` | Amber tint |
| Medium | `#7ad4f2` | Blue tint |
| Done | Muted gray | Gray tint, 50% opacity |

### 14.4 DriftBar

Category name, percentage, filled progress bar. Colours: green 0–40, amber 41–70, red 71–100. Rolling 4-week consistency. No points, no streaks.

---

## 15. Chat screen

### 15.1 Layout

- Header: Jarvis avatar (pulsing dot), "Coach", "Active · watching your day", back button
- Scrollable message list, auto-scrolls to bottom on new message
- Quick reply chips when contextually relevant
- Input bar: text + send + mic button (hold activates Jarvis voice mode)

### 15.2 Message types

| Type | Rendering |
|---|---|
| Coach text | Dark surface bubble, left, bottom-left radius 4px |
| User text | Accent green bubble, right, bottom-right radius 4px |
| Consequence card | Amber tint card inlined below coach message |
| Replan prompt | Tappable time slot card |
| Context card | Shows detected context change and actions triggered |

### 15.3 Context window management

In-memory history in `useChatStore`. Trim to 20 turns before API calls — always keep first message and all messages from last 5 minutes.

---

## 16. Visual design system

### 16.1 Colour tokens

| Token | Hex |
|---|---|
| Background primary | `#0e0f11` |
| Surface | `#16181c` |
| Surface elevated | `#1e2026` |
| Border | `rgba(255,255,255,0.07)` |
| Text primary | `#f0ede8` |
| Text muted | `rgba(240,237,232,0.45)` |
| Text hint | `rgba(240,237,232,0.18)` |
| Accent (Jarvis / active) | `#c8f27a` |
| Accent blue (info) | `#7ad4f2` |
| Amber (high severity) | `#f2b97a` |
| Red (critical) | `#f27a7a` |

### 16.2 Typography

- Primary: DM Sans (Google Fonts) — 300, 400, 500
- Display: DM Serif Display — greeting headings only
- Base: 13px body, 11px labels, 10px caps/tags

### 16.3 Spacing & radius

- Card: 16px large, 10px small
- Phone frame: 40px
- List item gap: 8px, section gap: 16px
- Screen padding: 20px horizontal

### 16.4 Severity left borders

- Critical: `2px solid #f27a7a`
- High: `2px solid #f2b97a`
- Medium: `2px solid #7ad4f2`
- Done: `2px solid rgba(255,255,255,0.15)` at 50% opacity

### 16.5 Jarvis overlay

Fullscreen Modal. Dark bg 95% opacity. Pulsing accent green orb (keyframes on `transform` + `opacity` only). Transcript text below orb. Dismisses on tap or `jarvis.idle`.

---

## 17. Build phases for Claude Code

Execute in order. Complete each phase fully before starting the next.

### Phase 1 — Project bootstrap
**Goal:** Bare Expo app, all dependencies installed, directory structure created

- `npx create-expo-app@latest dayos --template blank-typescript`
- `npx expo prebuild` — eject to bare workflow
- Install all dependencies from Section 2
- Create full directory structure from Section 3
- `tsconfig.json` with `strict: true`
- `src/types/index.ts` with all interfaces from Section 4
- `src/constants/index.ts` with colour tokens and severity config
- Verify: `npx expo run:android` builds without error

### Phase 2 — Database layer
**Goal:** All 11 SQLite tables created and queryable

- `src/db/client.ts` — connection + migration runner
- Migration v1 creating all 11 tables from Section 4
- `src/db/repositories.ts` — all repo functions including bluetooth_device_map and sleep_record
- Test: all tables verified, bluetooth_device_map row created and read back

### Phase 3 — Event bus
**Goal:** Typed events flow correctly between services

- `src/events/bus.ts` — EventBus class + singleton + all typed emit helpers
- Test: subscribe to `activity.skipped`, emit it, handler fires

### Phase 4 — Onboarding flow
**Goal:** Full onboarding completes, all tables seeded, voice and wake word chosen

- `onboardingTurn()` + `parseOnboardingPayload()` in `aiService.ts`
- `useOnboardingStore` in `src/store/index.ts`
- `OnboardingFlow.tsx` — all 3 screens including Jarvis setup
- `App.tsx` routing — check `onboarding_complete`, route accordingly
- Test: full onboarding, all SQLite tables seeded correctly

### Phase 5 — Home screen
**Goal:** Daily timeline visible with real data and context badge

- `useAppStore` with `loadAll()`
- `HomeScreen.tsx`, `ActivityBlock.tsx`, `DriftBar.tsx`, `CoachBanner.tsx`
- Context badge in header
- Test: renders correctly with seeded data, context badge shows

### Phase 6 — AI coach + chat
**Goal:** Coach chat functional end-to-end with correct tone

- Complete `aiService.ts` — `chat()`, `generateMorningBriefing()`, `classifyIntent()`
- `useChatStore`
- `ChatScreen.tsx`, `ConsequenceCard.tsx`
- Test: message sent, AI response under 5s, coach tone correct, no emoji

### Phase 7 — Consequence engine
**Goal:** Skips trigger AI messages at correct escalation levels

- `consequenceEngine.ts`
- `generateConsequenceMessage()`, `generateRationalisationChallenge()` in `aiService.ts`
- Wire `consequenceEngine.start()` in bootstrap
- Test: two skips in one week → mirror message fires in chat

### Phase 8 — Jarvis voice layer
**Goal:** Wake word activates, STT transcribes, TTS speaks correctly

- `wakeWordService.ts` — Porcupine + Foreground Service
- `sttService.ts` — Whisper on-device
- `ttsService.ts` — ElevenLabs fetch + expo-av + sanitiseForSpeech()
- `intentService.ts` — classification + routing + confirmation flow
- `JarvisOverlay.tsx` — animated overlay
- Test: say wake phrase → transcribed → intent classified → spoken response

### Phase 9 — Wake-up sequence
**Goal:** Jarvis delivers personalised spoken wake-up at target time

- `sleepService.ts` — Health Connect / HealthKit polling
- `wakeSequence.ts` — full sequence orchestrator
- `generateWakeSequence()` in `aiService.ts`
- `sleep_record` writes after each sequence
- Test: simulate wake trigger → spoken sequence → music prompt → day.started fires

### Phase 10 — Bluetooth context engine
**Goal:** BT device connection auto-detects context and triggers activities

- `bluetoothContext.ts` — broadcast receiver + device map lookup
- `contextEngine.ts` — signal fusion + state machine
- `BluetoothMappingScreen.tsx` settings screen
- Wire context changes to activity auto-start, music, DND
- Test: connect mapped device → context updates → greeting spoken → activity logged

### Phase 11 — Admin integrations
**Goal:** Voice commands can write to Calendar, Reminders, and Tasks

- `adminService.ts` — Calendar, Reminders, Contacts, Intents, iOS Shortcuts
- All write intents wired through confirmation flow
- Test: "Add gym Thursday 5pm" → confirmation → calendar event created

### Phase 12 — Music integration
**Goal:** Spotify plays correct playlist on context change and wake-up

- `musicService.ts` — Spotify SDK wrapper
- Wired to `context.changed` and wake sequence
- Test: gym context detected → gym playlist plays

### Phase 13 — Google Calendar sync
**Goal:** Today's blocks sourced from real calendar data

- `calendarService.ts` — MCP + expo-calendar
- Map events to `activity_log` rows
- Emit `schedule.updated` on sync
- Test: calendar event appears in home timeline

### Phase 14 — Screen time
**Goal:** Usage tracking + nudges + hard blocks working on Android

- `screentimeService.ts` — UsageStatsManager + AccessibilityService
- Soft nudge at 80%, hard block at 100%
- iOS FamilyControls entitlement application running in parallel
- Test: 10-min limit → nudge at 8 min → block at 10 min

---

## 18. Key constraints for Claude Code

### 18.1 Privacy constraints

- `diary_entry.content` NEVER leaves the device — enforced at repo layer
- AI receives only `themes[]` from diary, never `content`
- Sleep data sent to AI as score + duration only — no raw timestamps
- No audio ever sent to cloud — Porcupine and Whisper are fully on-device
- Bluetooth MAC addresses stored locally only, never transmitted
- Every Anthropic API call includes no-training header
- No analytics or crash reporting SDK that transmits user behaviour

### 18.2 Architecture constraints

- No service calls another directly — all communication via event bus
- No raw SQL outside `src/db/repositories.ts`
- No `type: any` — use `unknown` with type guards
- AI layer has read-only access to `guard_rule`
- All write actions require explicit voice confirmation — no exceptions
- Jarvis never speaks while already speaking — always check `jarvis.speaking` state

### 18.3 UI constraints

- Dark theme only — no light mode
- No emoji in AI-generated messages
- No gamification elements — no points, badges, or streaks as goals
- Momentum bars show rolling 4-week consistency %, not a score
- Coach banner updates once per day
- JarvisOverlay renders above all screens — Modal with highest z-index

### 18.4 Build constraints

- Complete each phase before the next — no partial implementations
- Every file has strict TypeScript types — no implicit any
- Run `npx expo run:android` after each phase, fix all errors before proceeding
- SQLite migrations additive only — never `DROP TABLE`
- Foreground Service must declare correct permissions in `AndroidManifest.xml`
- Microphone usage must be justified in iOS `Info.plist` privacy strings
- `sanitiseForSpeech()` must be called on ALL text before passing to ElevenLabs

---

## 19. Testing checkpoints

| Phase | Checkpoint |
|---|---|
| 1 | Bare workflow builds, no TS errors, directory structure matches Section 3 |
| 2 | All 11 tables exist, bluetooth_device_map row can be created and read |
| 3 | Event subscribe + emit + handler fires correctly |
| 4 | Full onboarding completes, all tables seeded, voice ID stored |
| 5 | Home timeline renders, context badge shows, drift bars correct |
| 6 | Chat responds under 5s, coach tone correct, no markdown in response |
| 7 | Two skips in one week → consequence card in chat |
| 8 | Wake phrase spoken → transcribed → spoken response via ElevenLabs |
| 9 | Simulated wake trigger → spoken briefing → music prompt → day.started |
| 10 | Mapped BT device connects → context changes → greeting spoken → activity logged |
| 11 | Voice command → confirmation spoken → calendar event created |
| 12 | Gym context → correct Spotify playlist plays |
| 13 | Calendar event appears in home timeline |
| 14 | 10-min app limit → nudge at 8 min → block at 10 min |

---

## 20. Environment & secrets

```bash
# .env  (never commit — add to .gitignore)
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
EXPO_PUBLIC_ELEVENLABS_API_KEY=...
EXPO_PUBLIC_PICOVOICE_ACCESS_KEY=...
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...

# .env.example  (commit this)
EXPO_PUBLIC_ANTHROPIC_API_KEY=your-key-here
EXPO_PUBLIC_ELEVENLABS_API_KEY=your-key-here
EXPO_PUBLIC_PICOVOICE_ACCESS_KEY=your-key-here
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your-key-here
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-key-here
```

### Required external registrations

| Service | Where | What you need |
|---|---|---|
| Anthropic | console.anthropic.com | API key |
| ElevenLabs | elevenlabs.io | API key + voice ID |
| Picovoice | console.picovoice.ai | Access key + custom .ppn model file (train your wake phrase — 25 repetitions, ~10 min) |
| Spotify | developer.spotify.com | Client ID + redirect URI + Premium account |
| Google Cloud | console.cloud.google.com | OAuth client ID, Calendar API enabled |
| Health Connect (Android) | No registration — declare permissions in AndroidManifest.xml | `SleepSessionRecord` read permission |
| Apple HealthKit (iOS) | No registration — declare in Info.plist | `NSHealthShareUsageDescription` |
| Apple FamilyControls (iOS) | developer.apple.com — entitlement request | Entitlement approval for Screen Time API |

---

*DayOS v2.0 — Colin Swart / Parallel Tech — All rights reserved*