# Phase 7a — Opus Review (2026-06-27)

## Findings & Resolutions

### HIGH — Velocity count used `updatedAt` as proxy for completion date
**Verdict:** Accepted as-is with documentation.  
`updatedAt` changes on any mutation, not just status→DONE. A task completed weeks ago
and later retitled could be miscounted. Added a comment in `goals.ts:computeProgress()`
documenting this known limitation. Adding a `completedAt` field would require a migration
and was judged unnecessary for a personal app.

### HIGH — Misleading 404 when PATCH /api/tasks/:id connects to non-existent goal
**Fixed:** Added explicit `goal.findUnique` validation before the connect, returning
`400 "Goal not found"` instead of the P2025-catch's `404 "Task not found"`.  
File: `server/src/routes/tasks.ts`

### MEDIUM — No test coverage for goalId behavior in tasks
**Fixed:** Added two new describe blocks to `server/src/__tests__/tasks.test.ts`:
- `GET /api/tasks — goalId filter`: tests string filter and `goalId=null`
- `PATCH /api/tasks/:id — goalId field`: tests connect, 400 on missing goal,
  disconnect with null, and invalid type rejection.
7 new tests; tasks test suite now 39 tests.

### MEDIUM — N+1 queries on GET /api/goals
**Fixed:** Rewrote GET handler to use a single `findMany` with
`include: { tasks: { select: { status, updatedAt } } }` and compute progress in JS
via `computeProgress()`. Also refactored PATCH to use `fetchGoalProgress` (which does
one `task.findMany`). Goals test updated to include `tasks` in the mock.

### LOW — linkedHabitId not validated against Habit
**Accepted:** Not a FK relation by design (to avoid cascade complexity). Dangling
references are acceptable in a single-user app.

### LOW — targetDate UTC midnight timezone edge case
**Accepted:** Consistent with `dueDate` on Task (same issue exists there).
The chat formatter uses timezone-aware `dateFormatter`, so display is correct.
Full fix would require storing as `YYYY-MM-DD` string — deferred.

## Final test counts
- goals.test.ts: 32 tests ✅
- tasks.test.ts: 39 tests ✅  
- Full suite: 225/227 (2 pre-existing sleep.test.ts failures, unrelated to 7a)
