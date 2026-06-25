# Phase 4d — Opus Review

Date: 2026-06-25

## Findings

### CONFIRMED — Fixed

**C1**: Cache not invalidated on empty-write or archive-only paths (use-calendar-sync.ts)
- When `postCalendarSync` returned empty `focusBlocks`, the early `return` at line 64 bypassed `queryClient.invalidateQueries`. Old blocks had already been archived, leaving the dashboard showing stale scheduled hours.
- Also: when all `writeFocusBlock` calls failed (`toSave.length === 0`), invalidation was skipped.
- Fix: added invalidation before the `focusBlocks.length === 0` early return; moved final invalidation outside the `if (toSave.length > 0)` guard.

**C2**: No tests for `GET /api/focus-blocks/week-summary` (focus-blocks.test.ts)
- Fix: added 5 tests covering: 401, zero blocks, past block (elapsed), future block (not elapsed), full target (zero shortfall), ACTIVE filter check.
- Extended Prisma mock to include `settings.findUnique` / `settings.upsert`.

### REFUTED

- Rolling 7-day vs ISO week mismatch: pre-existing from phase 4c, not introduced by this diff.
- `round2` duplication: cleanup-level, not a correctness issue.
- `formatHours` placement: no second consumer yet.
