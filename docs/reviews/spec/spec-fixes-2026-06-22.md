# Spec Fixes Applied
**Date:** 2026-06-22  
**Source reviews:** `spec-sonnet-2026-06-22.md`, `spec-opus-2026-06-22.md`

---

## Fixes from HIGH findings

| # | Finding | Fix applied | File(s) |
|---|---------|-------------|---------|
| S1/O2 | Sleep quality overlap (Poor/Fair boundary) | Redefined as Poor < `sleepThresholdHours`, Fair between thresholds, Good ≥ `goodThresholdHours`. Added `goodThresholdHours` to Settings | `features.md`, `data-model.md` |
| S2/O4 | No way to identify app-created focus blocks | Added explicit SQLite-lookup step to flow. Added `calendarMarker` UUID (stored in event notes). Added `@unique` on `deviceCalendarEventId` and `calendarMarker`. Added `FocusBlockStatus` enum | `features.md`, `data-model.md` |
| S3 | AI Chat claims to add tasks with no tool use defined | Clarified Phase 3 is conversational-only. Tool use moved to `enhancements.md` | `features.md` |
| S4/O8 | Server URL config missing from early phases | Added minimal server URL config to Phase 1. Full onboarding stays Phase 6 | `phases.md` |
| O1 | Memory file contradicted spec (Google Calendar API / nightly cron) | Updated memory file to match spec (expo-calendar / on-app-open) | `memory/project_ai_assistant.md` |
| O3 | Expo Go cannot run Health Connect | Added EAS dev-client requirement to Phase 4, setup.md, dev-workflow.md, architecture.md | `phases.md`, `setup.md`, `dev-workflow.md`, `architecture.md` |
| O5 | No timezone handling | Added timezone contract to data-model.md. HabitCompletion.date changed from DateTime to String. `timezone` field added to Settings. X-Timezone header documented | `data-model.md`, `features.md`, `architecture.md`, `phases.md` |
| O6 | No backend authentication | Added bearer token auth to Phase 1. Added `API_BEARER_TOKEN` env var. Documented in architecture.md and setup.md | `phases.md`, `architecture.md`, `setup.md` |

## Fixes from MEDIUM findings

| # | Finding | Fix applied | File(s) |
|---|---------|-------------|---------|
| S5/OL6 | FocusBlock.date redundant | Removed `date` field. Date derived from `startTime` | `data-model.md` |
| S6/OL7 | HabitCompletion missing cascade delete | Added `onDelete: Cascade` | `data-model.md` |
| S7 | setup.md backend URL outdated | Replaced with two-scenario description (emulator: 10.0.2.2, phone: Tailscale) | `setup.md` |
| S8 | Dashboard "used" undefined | Reframed as "elapsed" (past blocks counted automatically) | `features.md` |
| O1m | Streaming conflicts with REST/TanStack Query | Specified SSE as transport. Custom hook noted. Added `react-native-sse` to tech stack | `features.md`, `architecture.md` |
| O3m | expo-calendar calendar selection ambiguous | Added calendar selection to onboarding. Added `targetCalendarId` to Settings | `features.md`, `data-model.md`, `setup.md` |
| O4m | Health Connect data freshness unhandled | Added no-data handling, multi-session aggregation, `sessionCount` field, `@unique` on SleepRecord.localDate | `features.md`, `data-model.md` |
| O5m | Weekend skip not configurable | Added `includeWeekends` Boolean to Settings. Defined under-capacity shortfall notice | `features.md`, `data-model.md` |
| O6m | Sleep reschedule no fallback for full afternoon | Added fallback ordering: afternoon today → tomorrow morning → drop with notice. Multi-block handled in sequence | `features.md` |
| O7m | Model ID and mixed-provider handling | Added note to verify model ID. GPT-4o hidden if key absent | `features.md`, `data-model.md` |

## Fixes from LOW findings

| # | Finding | Fix applied | File(s) |
|---|---------|-------------|---------|
| S9/OL4 | Health Connect shown as external in diagram | Moved inside app box, updated diagram | `architecture.md` |
| S10 | Claude UI testing overstated | Changed to "limited" with explanatory note | `dev-workflow.md` |
| S11/OL setup | Emulator setup not a Phase 1 prerequisite | Added Android Studio setup section to setup.md | `setup.md` |
| OL1 | Habit weekly frequency ambiguous | Added `weeklyTargetDays` field. Defined streak semantics | `data-model.md`, `features.md` |
| OL2 | Settings singleton not seeded | Added seeding note to data-model.md and setup.md | `data-model.md`, `setup.md` |
| OL3 | Missing updatedAt on mutable models | Added `updatedAt @updatedAt` to Habit, FocusBlock, SleepRecord, Settings | `data-model.md` |
| OL5 | Dark mode listed inconsistently | Softened §1 wording to "planned dark mode support (delivered in Phase 6)" | `features.md` |
| OL4 | Architecture diagram missing sleep POST arrow | Added app→backend sleep-summary SSE arrow | `architecture.md` |

## Deferred (not fixed)

| # | Finding | Reason |
|---|---------|--------|
| S12 | ChatMessage no session concept | Partially addressed: added `conversationId` field and Phase 6 task. Full Conversation model deferred |
| OL7 | Claude UI testing per monorepo tooling | Added monorepo layout section to dev-workflow.md |

---

## Verdict
All HIGH and MEDIUM findings addressed. Two LOW items partially addressed and deferred to Phase 6. Specs are now consistent with each other and with the project memory file.
