# Build Phases

Each sub-phase ends with the quality gate and a git commit (see `dev-workflow.md`).  
Git push follows each commit if a remote is configured.

---

## Phase 1 — Foundation

### 1a — Monorepo & Tooling ✅
- [x] `git init` in project root; create `.gitignore` (node_modules, .env, *.db, dist/)
- [x] Root `package.json` with shared scripts (`lint:all`, `typecheck:all`)
- [x] `/app` — Expo project scaffold (TypeScript template)
- [x] `/server` — Express project scaffold (TypeScript)
- [x] Per-package `tsconfig.json` (RN target for app, Node/CommonJS for server)
- [x] Per-package `eslint.config.js` (expo flat config for app, @typescript-eslint flat config for server)
- [x] `git commit`: `phase-1a: monorepo structure and tooling`

### 1b — Backend Server ✅
- [x] Express app with base routes (`GET /health`)
- [x] Bearer token auth middleware (reads `API_BEARER_TOKEN` from env, validates `Authorization` header)
- [x] `X-Timezone` header parsing middleware
- [x] Error handling middleware
- [x] `server/.env.example` with all required env vars
- [x] `git commit`: `phase-1b: express server with auth and timezone middleware`

### 1c — Database ✅
- [x] Prisma schema (all models from `data-model.md`)
- [x] Initial migration + Settings singleton seed
- [x] Verify schema compiles and migration runs cleanly
- [x] `git commit`: `phase-1c: prisma schema and initial migration`

### 1d — Mobile Shell ✅
- [x] Expo app with bottom tab navigation (Dashboard, Tasks, Habits, Chat, Settings)
- [x] Placeholder screens for each tab
- [x] TanStack Query provider wired up
- [x] Backend URL config: default `http://10.0.2.2:3000`, overridable via Settings stub
- [x] Bearer token stored in Expo SecureStore, sent with every request
- [x] `X-Timezone` header automatically appended to every API call
- [x] `git commit`: `phase-1d: mobile shell with navigation and API client`

---

## Phase 2 — Tasks & Habits

### 2a — Tasks Backend ✅
- [x] `GET /api/tasks` — list, with filter by status/priority
- [x] `POST /api/tasks` — create
- [x] `PATCH /api/tasks/:id` — update
- [x] `DELETE /api/tasks/:id` — delete
- [x] Jest tests for all endpoints
- [x] `git commit`: `phase-2a: tasks REST API`

### 2b — Habits Backend
- [ ] `GET /api/habits` — list with today's completion status
- [ ] `POST /api/habits` — create
- [ ] `PATCH /api/habits/:id` — update
- [ ] `DELETE /api/habits/:id` — delete (cascades completions)
- [ ] `POST /api/habits/:id/complete` — log completion for local date
- [ ] Streak calculation logic (daily = consecutive local dates; weekly = consecutive weeks meeting target)
- [ ] Jest tests including streak edge cases
- [ ] `git commit`: `phase-2b: habits REST API with streak logic`

### 2c — Tasks Screen (Mobile)
- [ ] Task list screen grouped by priority or due date
- [ ] Inline create/edit (no modal)
- [ ] Swipe-to-complete and swipe-to-delete
- [ ] Filter bar (status, priority)
- [ ] `git commit`: `phase-2c: tasks screen`

### 2d — Habits Screen + Dashboard (Mobile)
- [ ] Habit checklist screen (only today's habits shown)
- [ ] Tap to complete/uncomplete
- [ ] Streak display per habit
- [ ] Dashboard: tasks-due-today card, habits-today card
- [ ] `git commit`: `phase-2d: habits screen and dashboard cards`

---

## Phase 3 — AI Chat

### 3a — Chat Backend (Streaming)
- [ ] `POST /api/chat` — SSE endpoint streaming Claude responses
- [ ] Anthropic SDK integration (verify model ID against current catalog)
- [ ] System prompt builds context: current tasks (priority + due date) + today's habits
- [ ] Context window policy: last 20 messages sent per request
- [ ] Chat history persisted (ChatMessage with conversationId)
- [ ] `git commit`: `phase-3a: chat SSE endpoint with Claude integration`

### 3b — OpenAI Fallback + Model Selection Backend
- [ ] Optional OpenAI provider (only active if `OPENAI_API_KEY` set)
- [ ] `GET /api/chat/models` — returns available models based on configured keys
- [ ] `git commit`: `phase-3b: optional OpenAI fallback and model list endpoint`

### 3c — Chat UI (Mobile)
- [ ] Full-screen chat interface
- [ ] SSE streaming client (custom hook, not TanStack Query)
- [ ] Message bubbles (user / assistant)
- [ ] "New conversation" action (generates new conversationId)
- [ ] `git commit`: `phase-3c: chat UI with SSE streaming`

### 3d — Settings Screen (Mobile)
- [ ] Model selector (hides OpenAI if key not configured)
- [ ] Server URL override field
- [ ] `git commit`: `phase-3d: settings screen`

---

## Phase 4 — Calendar Auto-Blocking

### 4a — Dev Build + Permissions + Calendar Selection
- [ ] EAS `eas.json` with development profile configured
- [ ] expo-calendar permission request on first launch
- [ ] Calendar selection screen: pick source calendars (read) + target calendar (write)
- [ ] Option to create a new "AI Focus Blocks" local calendar
- [ ] Persist `targetCalendarId` in Settings (via backend)
- [ ] `git commit`: `phase-4a: expo-calendar permissions and calendar selection`

### 4b — Scheduling Algorithm (Backend)
- [ ] `/api/calendar/sync` endpoint: receives events list + timezone
- [ ] Gap-finding algorithm (≥30 min, within workday hours, skip weekends unless configured)
- [ ] Conflict detection (no overlap with any existing event)
- [ ] Under-capacity detection (return shortfall info)
- [ ] Returns list of focus blocks with `calendarMarker` UUIDs
- [ ] Jest tests for algorithm (overlap cases, weekend skipping, under-capacity)
- [ ] `git commit`: `phase-4b: focus block scheduling algorithm`

### 4c — Calendar Sync Flow (Mobile)
- [ ] On app open: query SQLite for known ACTIVE future block IDs → delete from calendar → mark DELETED
- [ ] Read upcoming week's events from selected source calendars
- [ ] POST events + timezone to `/api/calendar/sync`
- [ ] Write returned focus blocks to target calendar; store `calendarMarker` in event notes
- [ ] POST `deviceCalendarEventId` + `calendarMarker` pairs to backend to persist FocusBlock records
- [ ] `git commit`: `phase-4c: calendar sync flow`

### 4d — Dashboard Focus Widget (Mobile)
- [ ] Focus block widget: scheduled hours vs. elapsed this week
- [ ] Shortfall notice if under-capacity
- [ ] `git commit`: `phase-4d: dashboard focus block widget`

---

## Phase 5 — Sleep-Aware Rescheduling

### 5a — Health Connect Integration (Mobile)
- [ ] `READ_SLEEP` permission request (requires dev build + physical device)
- [ ] Read last night's sleep sessions on app open
- [ ] Aggregate sessions: total duration, deep sleep, REM, session count
- [ ] Derive quality using `sleepThresholdHours` / `goodThresholdHours` from Settings
- [ ] Handle no-data case gracefully (show "No sleep data", skip reschedule)
- [ ] `git commit`: `phase-5a: health connect sleep read`

### 5b — Sleep Backend
- [ ] `POST /api/sleep` — persist SleepRecord (upsert on localDate to prevent duplicates)
- [ ] Reschedule logic: if Poor, find ACTIVE morning blocks (startTime < morningCutoffHour today), compute available afternoon slots
- [ ] Fallback ordering: later today → tomorrow morning → drop with notice
- [ ] Returns list of morning blocks to delete + new afternoon blocks to create
- [ ] Jest tests for reschedule logic (full afternoon, multiple displaced blocks)
- [ ] `git commit`: `phase-5b: sleep persistence and reschedule logic`

### 5c — Sleep Reschedule Flow (Mobile)
- [ ] Delete displaced morning blocks from device calendar
- [ ] Write rescheduled afternoon blocks to calendar
- [ ] POST new deviceCalendarEventIds to backend
- [ ] `git commit`: `phase-5c: sleep-driven calendar reschedule flow`

### 5d — Sleep Dashboard + Settings (Mobile)
- [ ] Dashboard sleep card: "Last night: 6.1h (Fair) — 1 session rescheduled to 2pm"
- [ ] Settings: sleep threshold, good threshold, morning cutoff hour
- [ ] `git commit`: `phase-5d: sleep dashboard card and settings`

---

## Phase 6 — Polish

### 6a — Push Notifications
- [ ] Expo Notifications setup
- [ ] Task due date reminders (day before + day of)
- [ ] Focus block start alerts (15 min before)
- [ ] `git commit`: `phase-6a: push notifications`

### 6b — Dark Mode
- [ ] NativeWind dark mode throughout all screens
- [ ] Respects system preference
- [ ] `git commit`: `phase-6b: dark mode`

### 6c — Full Onboarding
- [ ] Server URL + bearer token setup screen
- [ ] Calendar permission + calendar selection flow
- [ ] Health Connect permission flow
- [ ] Skip options for calendar and Health Connect (graceful degradation)
- [ ] `git commit`: `phase-6c: onboarding screen`

### 6d — Error Handling & Offline States
- [ ] Backend unreachable: show banner, disable dependent features
- [ ] Calendar permission denied: show prompt to enable in Settings
- [ ] Health Connect unavailable: hide sleep card gracefully
- [ ] API error toasts
- [ ] `git commit`: `phase-6d: error handling and offline states`
