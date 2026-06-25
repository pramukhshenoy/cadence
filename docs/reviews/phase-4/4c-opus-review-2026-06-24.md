# Phase 4c Opus Review — 2026-06-24

## Findings (CONFIRMED / PLAUSIBLE after verification)

### CONFIRMED — Correctness Bugs

**C1. Zombie ACTIVE blocks when user manually deletes a calendar event**
- File: `app/src/hooks/use-calendar-sync.ts`
- Bug: Sonnet's fix ("only archive successfully-deleted blocks") creates a worse failure mode. If a user deletes a focus block from their native calendar app, `deleteCalendarEvent` fails every sync → that block's id is never passed to `archiveFocusBlocks` → stays ACTIVE in DB indefinitely → `getActiveFutureBlocks` returns it on every subsequent sync → infinite failed-delete loop. The block is effectively zombie: device calendar never has it, but backend thinks it's ACTIVE.
- Fix: archive ALL blocks regardless of delete success. Calendar delete failures mean the event is already gone (user removed it, or it expired) — archiving is always correct. The only failure mode where we should NOT archive is a permission error, and that's caught by the upfront `permStatus` check.

**C2. All deletes fail → new blocks written on top of still-ACTIVE records**
- File: `app/src/hooks/use-calendar-sync.ts`
- Bug: If every `deleteCalendarEvent` call fails (e.g., entire calendar is inaccessible), `deletedIds = []`, so `archiveFocusBlocks` is skipped. The sync proceeds to `postCalendarSync`, receives new blocks, writes them to device calendar, and then `saveFocusBlocks` creates new ACTIVE records. On every subsequent sync, the same OLD blocks are returned again (still ACTIVE) PLUS the new ones — ACTIVE count grows unboundedly.
- Fix: same as C1 (archive all) — archiving all blocks first ensures no ACTIVE accumulation even when deletes fail.

**C3. No cancellation guard — concurrent syncs in React Strict Mode**
- File: `app/src/hooks/use-calendar-sync.ts`
- Bug: React Strict Mode double-invokes effects in dev. Without a cancellation flag, both `runSync()` invocations run fully and concurrently — each writes N focus blocks → 2N duplicate calendar events and 2N DB records per app open in development.
- Fix: add `let cancelled = false;` + cleanup `return () => { cancelled = true; }`, with `if (cancelled) return;` guards after each major await. Also prevents stale syncs when `settings.targetCalendarId` changes (cleanup cancels the prior run before the next starts).

**C4. Silent `catch(() => {})` gives zero debugging visibility**
- File: `app/src/hooks/use-calendar-sync.ts`
- Bug: Any thrown error in `runSync` is silently discarded. When `saveFocusBlocks` fails, device calendar events are permanently orphaned (written, but backend has no record). The user sees nothing; there is no log trace.
- Fix: `catch((err: unknown) => { if (!cancelled) console.error('[CalendarSync]', err); })`

### CONFIRMED — Cleanup / Efficiency

**C5. `archiveFocusBlocks` and `readWeekEvents` run sequentially despite being independent**
- File: `app/src/hooks/use-calendar-sync.ts`
- Cost: one extra network round-trip on every sync startup (archiving blocks over HTTP while the calendar read waits).
- Fix: `Promise.all([archiveFocusBlocks(...), readWeekEvents(...)])` — they share no state and can overlap.

**C6. `toSave` for-loop inconsistent with Step 1's `filter`/`map` pattern**
- File: `app/src/hooks/use-calendar-sync.ts`
- Cost: mixing imperative and functional styles in the same function.
- Fix: `focusBlocks.flatMap((b, i) => ...)` — consistent with how successful/failed results are handled elsewhere in the hook.

**C7. `BlockInput` type defined inside route handler instead of file scope**
- File: `server/src/routes/focus-blocks.ts`
- Cost: type is re-created on every request invocation; unavailable to future helpers in the same file.
- Fix: move `type BlockInput = { ... }` to file scope (between imports and router).

## Skipped

- **Empty sourceCalendarIds short-circuit**: `readWeekEvents` already returns `[]` early when `sourceCalendarIds.length === 0`. Not a bug.
- **`Promise.allSettled` result not inspected in delete step**: intentional — results are only used to decide which events have been removed from the device. After C1/C2 fix, we archive all regardless, so inspection is unnecessary.
