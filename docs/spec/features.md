# Feature Requirements

## 1. Dashboard
- Summary cards: tasks due today, habits for today, focus hours this week
- Sleep card: last night's sleep duration, quality, sessions rescheduled
- Focus block widget: this week's scheduled vs. elapsed focus time (past blocks counted automatically — no user action needed)
- Quick-add button for tasks and habits
- Clean, modern card-based layout with planned dark mode support (delivered in Phase 6)

## 2. Tasks
- Fields: title, description, priority (Low/Medium/High), due date, status (Todo/In Progress/Done)
- List view grouped by priority or due date
- Inline create/edit (Notion-style, no modal)
- Swipe to complete or delete
- Filter by status and priority

## 3. Habits
- Fields: name, description, frequency (Daily/Weekly)
- Weekly habits require target day(s) of week (e.g., Mon/Wed/Fri) or a weekly target count
- Today's habits shown as a checklist on the dashboard (only habits scheduled for today appear)
- Streak tracking: Daily = consecutive days; Weekly = consecutive weeks with target met
- Simple history view

## 4. AI Chat
- Full-screen chat interface as the primary interaction surface
- Backend proxies all Claude API calls (API key never leaves the server)
- Streaming responses via **SSE** (Server-Sent Events) — not standard JSON REST; requires a custom hook on the client, not TanStack Query
- System prompt automatically includes current tasks and habits for context
- **Phase 3 scope: conversational only.** The AI answers questions about your tasks, schedule, and habits. It does not write to the backend directly in Phase 3.
- Tool use (AI creating/updating tasks) is a candidate for a future enhancement — see `enhancements.md`
- Chat history persisted in SQLite, grouped by `conversationId`
- Context policy: last 20 messages sent per request (prevents context window overflow)
- Settings: switch between Claude models or OpenAI; GPT-4o option hidden if `OPENAI_API_KEY` is not configured

## 5. Calendar Auto-Blocking
- No Google Cloud setup or API keys — uses `expo-calendar` to read and write the device's local calendar (which syncs automatically with Google Calendar)
- One-time permission request: `READ_CALENDAR` + `WRITE_CALENDAR` on Android
- User configures: focus hours per week, working hours window (e.g., 9am–6pm), whether to include weekends

**Calendar selection (onboarding):**
- On first launch, user selects which calendars to read from (for conflict detection)
- User selects a single writable target calendar to write focus blocks to
- Selected `calendarId` persisted in Settings
- Option: create a new dedicated "AI Focus Blocks" local calendar

**Flow on app open:**
1. App queries SQLite for known focus block IDs (`status = ACTIVE`, `startTime > now`)
2. App deletes those events from device calendar via `expo-calendar` (cleanup)
3. App marks those FocusBlock rows as `DELETED` in SQLite
4. App reads all events for the upcoming week from selected calendars via `expo-calendar`
5. App POSTs the event list + device timezone to the backend (`/api/calendar/sync`)
6. Backend scheduling algorithm finds true gaps of ≥30 min — no overlap with any existing event
7. Backend returns a list of focus blocks to create (with a `calendarMarker` UUID per block)
8. App writes the focus blocks to the target calendar via `expo-calendar`, storing the `calendarMarker` in the event notes
9. App POSTs the new `deviceCalendarEventId` + `calendarMarker` pairs to backend
10. Backend creates `FocusBlock` records in SQLite

**Scheduling rules:**
- Respects all events in the selected source calendars
- Fills up to X hours/week with "Focus Block" events
- Skips weekends unless `includeWeekends = true` in Settings
- Optionally links a block to a specific task

**Under-capacity:** If fewer focus hours are available than requested, the algorithm fills what it can and the dashboard shows a shortfall notice (e.g., "Could only schedule 6 of 10 requested hours this week").

**Partial failure recovery:** If the app successfully creates a calendar event but the backend POST fails, the orphaned event is cleaned up on the next app open (Step 1 uses SQLite as the source of truth — any event not in SQLite is not a known focus block and is left alone).

## 6. Sleep-Aware Rescheduling
- Android app reads sleep data from **Health Connect** (on-device, no cloud API needed)
- Requires a **development build** (`expo-dev-client`) — Health Connect is not available in Expo Go
- Sleep data synced from Google Fit, Samsung Health, Fitbit, etc. via Health Connect
- On app open each morning, reads last night's sleep sessions and aggregates them

**Sleep quality classification** (all thresholds configurable in Settings):
- **Poor**: total duration < `sleepThresholdHours` (default 6.5h)
- **Fair**: `sleepThresholdHours` ≤ total < `goodThresholdHours` (default 7.0h)
- **Good**: total ≥ `goodThresholdHours`

**Data availability handling:**
- If no sleep data exists yet (tracker not synced): skip reschedule, show "No sleep data" on dashboard
- If multiple sessions (fragmented sleep, naps): aggregate total duration across all sessions for the night
- If data is from a prior day (already processed): skip (check `localDate` against today)

**If sleep is Poor:**
1. Query SQLite for `ACTIVE` focus blocks with `startTime` before `morningCutoffHour` today
2. Delete those calendar events via `expo-calendar`
3. Mark those FocusBlock rows `DELETED`
4. POST sleep summary (duration, quality, timezone) to backend
5. Backend computes available afternoon slots (respects existing calendar events)
6. **Fallback ordering if afternoon is full:** later today → tomorrow morning → drop with dashboard notice
7. App writes new focus block(s) to device calendar
8. Backend creates new FocusBlock records with `rescheduled: true` and `rescheduleReason`

**Dashboard shows:** "Last night: 6.1h (Fair) — 1 session rescheduled to 2pm"

**Settings:** sleep threshold (hours), good sleep threshold (hours), morning cutoff hour
