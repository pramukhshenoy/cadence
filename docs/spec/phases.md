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

### 2b — Habits Backend ✅
- [x] `GET /api/habits` — list with today's completion status
- [x] `POST /api/habits` — create
- [x] `PATCH /api/habits/:id` — update
- [x] `DELETE /api/habits/:id` — delete (cascades completions)
- [x] `POST /api/habits/:id/complete` — log completion for local date
- [x] Streak calculation logic (daily = consecutive local dates; weekly = consecutive weeks meeting target)
- [x] Jest tests including streak edge cases
- [x] `git commit`: `phase-2b: habits REST API with streak logic`

### 2c — Tasks Screen (Mobile) ✅
- [x] Task list screen grouped by priority or due date
- [x] Inline create/edit (no modal)
- [x] Swipe-to-complete and swipe-to-delete
- [x] Filter bar (status, priority)
- [x] `git commit`: `phase-2c: tasks screen`

### 2d — Habits Screen + Dashboard (Mobile) ✅
- [x] Habit checklist screen (only today's habits shown)
- [x] Tap to complete/uncomplete
- [x] Streak display per habit
- [x] Dashboard: tasks-due-today card, habits-today card
- [x] `git commit`: `phase-2d: habits screen and dashboard cards`

---

## Phase 3 — AI Chat

### 3a — Chat Backend (Streaming) ✅
- [x] `POST /api/chat` — SSE endpoint streaming Claude responses
- [x] Anthropic SDK integration (verify model ID against current catalog)
- [x] System prompt builds context: current tasks (priority + due date) + today's habits
- [x] Context window policy: last 20 messages sent per request
- [x] Chat history persisted (ChatMessage with conversationId)
- [x] `git commit`: `phase-3a: chat SSE endpoint with Claude integration`

### 3b — OpenAI Fallback + Model Selection Backend ✅
- [x] Optional OpenAI provider (only active if `OPENAI_API_KEY` set)
- [x] `GET /api/chat/models` — returns available models based on configured keys
- [x] `git commit`: `phase-3b: optional OpenAI fallback and model list endpoint`

### 3c — Chat UI (Mobile) ✅
- [x] Full-screen chat interface
- [x] SSE streaming client (custom hook, not TanStack Query)
- [x] Message bubbles (user / assistant)
- [x] "New conversation" action (generates new conversationId)
- [x] `git commit`: `phase-3c: chat UI with SSE streaming`

### 3d — Settings Screen (Mobile) ✅
- [x] Model selector (hides OpenAI if key not configured)
- [x] Server URL override field
- [x] `git commit`: `phase-3d: settings screen`

---

## Phase 4 — Calendar Auto-Blocking

### 4a — Dev Build + Permissions + Calendar Selection ✅
- [x] EAS `eas.json` with development profile configured
- [x] expo-calendar permission request on first launch
- [x] Calendar selection screen: pick source calendars (read) + target calendar (write)
- [x] Option to create a new "AI Focus Blocks" local calendar
- [x] Persist `targetCalendarId` in Settings (via backend)
- [x] `git commit`: `phase-4a: expo-calendar permissions and calendar selection`

### 4b — Scheduling Algorithm (Backend) ✅
- [x] `/api/calendar/sync` endpoint: receives events list + timezone
- [x] Gap-finding algorithm (≥30 min, within workday hours, skip weekends unless configured)
- [x] Conflict detection (no overlap with any existing event)
- [x] Under-capacity detection (return shortfall info)
- [x] Returns list of focus blocks with `calendarMarker` UUIDs
- [x] Jest tests for algorithm (overlap cases, weekend skipping, under-capacity)
- [x] `git commit`: `phase-4b: focus block scheduling algorithm`

### 4c — Calendar Sync Flow (Mobile) ✅
- [x] On app open: query SQLite for known ACTIVE future block IDs → delete from calendar → mark DELETED
- [x] Read upcoming week's events from selected source calendars
- [x] POST events + timezone to `/api/calendar/sync`
- [x] Write returned focus blocks to target calendar; store `calendarMarker` in event notes
- [x] POST `deviceCalendarEventId` + `calendarMarker` pairs to backend to persist FocusBlock records
- [x] `git commit`: `phase-4c: calendar sync flow`

### 4d — Dashboard Focus Widget (Mobile) ✅
- [x] Focus block widget: scheduled hours vs. elapsed this week
- [x] Shortfall notice if under-capacity
- [x] `git commit`: `phase-4d: dashboard focus block widget`

---

## Phase 5 — Sleep-Aware Rescheduling

### 5a — Health Connect Integration (Mobile)
- [x] `READ_SLEEP` permission request (requires dev build + physical device)
- [x] Read last night's sleep sessions on app open
- [x] Aggregate sessions: total duration, deep sleep, REM, session count
- [x] Derive quality using `sleepThresholdHours` / `goodThresholdHours` from Settings
- [x] Handle no-data case gracefully (show "No sleep data", skip reschedule)
- [x] `git commit`: `phase-5a: health connect sleep read`

### 5b — Sleep Backend ✅
- [x] `POST /api/sleep` — persist SleepRecord (upsert on localDate to prevent duplicates)
- [x] Reschedule logic: if Poor, find ACTIVE morning blocks (startTime < morningCutoffHour today), compute available afternoon slots
- [x] Fallback ordering: later today → tomorrow morning → drop with notice
- [x] Returns list of morning blocks to delete + new afternoon blocks to create
- [x] Jest tests for reschedule logic (full afternoon, multiple displaced blocks)
- [x] `git commit`: `phase-5b: sleep persistence and reschedule logic`

### 5c — Sleep Reschedule Flow (Mobile) ✅
- [x] Delete displaced morning blocks from device calendar
- [x] Write rescheduled afternoon blocks to calendar
- [x] POST new deviceCalendarEventIds to backend
- [x] `git commit`: `phase-5c: sleep-driven calendar reschedule flow`

### 5d — Sleep Dashboard + Settings (Mobile) ✅
- [x] Dashboard sleep card: "Last night: 6.1h (Fair) — 1 session rescheduled to 2pm"
- [x] Settings: sleep threshold, good threshold, morning cutoff hour
- [x] `git commit`: `phase-5d: sleep dashboard card and settings`

---

## Phase 6 — Polish

### 6a — Push Notifications
- [ ] Expo Notifications setup
- [ ] Task due date reminders (day before + day of)
- [ ] Focus block start alerts (15 min before)
- [ ] `git commit`: `phase-6a: push notifications`

### 6b — Dark Mode ✅
- [x] NativeWind dark mode throughout all screens
- [x] Respects system preference
- [x] `git commit`: `phase-6b: dark mode`

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

---

## Phase 7 — Goals ✅

### 7a — Goals Backend ✅
- [x] Prisma: `Goal` model, `GoalStatus` enum, `Task.goalId` FK + migration
- [x] REST API: CRUD at `/api/goals` with `progressPercent` and `velocityCount` computed fields
- [x] Task route: `?goalId=` filter on GET, `goalId` field on PATCH
- [x] Chat system prompt: `## Active Goals` section added to `buildSystemPrompt()`
- [x] Jest tests: 28 tests covering all routes + edge cases
- [x] `git commit`: `phase-7a: goals REST API and chat context`

### 7b — Goals Screen (Mobile) ✅
- [x] Types: `Goal`, `GoalStatus`, `CreateGoalPayload`, `UpdateGoalPayload` in `types/goal.ts`
- [x] Hooks: `useGoals`, `useCreateGoal`, `useUpdateGoal`, `useDeleteGoal` in `lib/goals.ts`
- [x] `goal-add.tsx`: expandable form with priority chips and date presets (1/3/6/12 months)
- [x] `goal-item.tsx`: card with progress bar, swipe to complete/delete, long-press to edit
- [x] `goals.tsx`: list screen with Active/Completed/Abandoned sections, SafeAreaView header
- [x] `goals/[id].tsx`: detail screen with scoped task list, progress bar, back navigation
- [x] `app-tabs.tsx`: Goals tab added between Habits and Chat with GoalsIcon
- [x] `git commit`: `phase-7b: goals screen, components, and navigation tab`

### 7c — Task-Goal Linking (Mobile) ✅
- [x] `UpdateTaskPayload` updated with `goalId?: string | null`
- [x] Task mutations (`create/update/delete`) now invalidate goals cache
- [x] `task-add.tsx`: goal chip selector in expanded form (hidden when `goalId` prop provided)
- [x] `task-item.tsx`: `◎ Goal name` badge in view mode; goal chip selector in edit mode
- [x] `tasks.tsx`: `handleAdd` passes `goalId` to `createTask.mutate`
- [x] `git commit`: `phase-7c: task-goal linking in create and edit flows`
