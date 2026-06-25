# Phase 4c Sonnet Review — 2026-06-24

## Findings (confirmed/plausible after verification)

### CONFIRMED — Correctness Bugs (Fixed)

**1. `archiveFocusBlocks` called unconditionally after `Promise.allSettled`**
- File: `app/src/hooks/use-calendar-sync.ts`
- Bug: calendar deletes used `allSettled` (correct) but then `archiveFocusBlocks` was called with ALL block IDs regardless of which deletes succeeded. Blocks whose calendar event failed to delete were still marked DELETED in the backend, orphaning the calendar event permanently with no recovery path.
- Fix: filter `deleteResults` by `status === 'fulfilled'` and only archive those IDs.

**2. Invalid ISO date strings pass validation in `POST /api/focus-blocks/batch`**
- File: `server/src/routes/focus-blocks.ts`
- Bug: filter only checked `typeof startTime === 'string'`, not that it was a valid date. `new Date("not-a-date")` produces Invalid Date; Prisma would receive it and either throw a 500 or store corrupted data.
- Fix: added `!isNaN(new Date(block.startTime).getTime())` and same for `endTime` to the filter predicate.

**3. `new Date(null)` injects Unix epoch for all-day events with null dates**
- File: `app/src/lib/calendar.ts`, `readWeekEvents`
- Bug: some OEM Android calendars return `null` for `startDate`/`endDate` on all-day events. `new Date(null)` silently returns `1970-01-01T00:00:00.000Z` rather than throwing, injecting a bogus epoch timestamp into the event list sent to the backend scheduler.
- Fix: added `.filter((e) => e.startDate != null && e.endDate != null)` before the map.

### PLAUSIBLE — Design Issues (Fixed)

**4. `hasRunRef` prevented re-sync when user changes target calendar in same session**
- File: `app/src/hooks/use-calendar-sync.ts`
- Bug: `hasRunRef` was set to `true` after first run and never reset on success. If `settings.targetCalendarId` changed (user picks a new calendar), the effect fired again but `hasRunRef` was `true` so it exited immediately — no re-sync occurred. Also, `hasRunRef.current = false` in the catch was dead code (effect dependency `settings?.targetCalendarId` wouldn't change to trigger a re-run).
- Fix: removed `hasRunRef` entirely. The effect dependency array `[settings?.targetCalendarId]` already expresses "run when targetCalendarId changes", which is exactly the desired trigger.

### PLAUSIBLE — Efficiency (Fixed)

**5. `getActiveFutureBlocks` and `getSourceCalendarIds` ran sequentially**
- File: `app/src/hooks/use-calendar-sync.ts`
- These two async operations are independent and were awaited one after the other. Merged into `Promise.all([...])` to reduce sync startup latency.

## Skipped

- **CLAUDE.md TanStack Query convention**: Calendar sync is a startup side-effect, not a UI data query. Using `useQuery`/`useMutation` for fire-and-forget background sync would add unnecessary complexity. The rule's intent is for UI-driven data fetching; this is correctly excluded.
- **Scheduler ISO week vs 7-day window mismatch**: Pre-existing behavior from Phase 4b algorithm, outside the 4c diff scope.
- **Empty sourceCalendarIds proceeds to postCalendarSync**: REFUTED — `readWeekEvents` guards this with an early return, and sending `[]` events to the scheduler is valid (schedules with no conflicts, which is correct when no source calendars are configured).
