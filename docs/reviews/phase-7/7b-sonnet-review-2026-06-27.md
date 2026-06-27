# Phase 7b Sonnet Self-Review — 2026-06-27

## Files Reviewed
- `app/src/types/goal.ts`
- `app/src/lib/goals.ts`
- `app/src/types/task.ts`
- `app/src/components/goal-add.tsx`
- `app/src/components/goal-item.tsx`
- `app/src/app/goals.tsx`
- `app/src/app/goals/[id].tsx`
- `app/src/components/app-tabs.tsx`

## Findings

### MEDIUM

**1. `keyExtractor` unused `index` param in goals.tsx**
The original keyExtractor declared `(item, index)` but `index` was unused — ESLint no-unused-vars would flag the param depending on config. Fixed by removing `index` from the signature.

**2. Empty state copy mismatch**
`goals.tsx` showed "No active goals. Add one above." when `sections.length === 0` (meaning zero goals exist at all, not just zero active ones). Copy changed to "No goals yet. Add one above." for accuracy.

**3. `UpdateTaskPayload` missing `goalId`**
`app/src/types/task.ts` added `goalId` to `Task` and `CreateTaskPayload` but not `UpdateTaskPayload`. Task PATCH already accepts `goalId` on the server. This is intentionally deferred to phase 7c (task-goal linking) where it will be wired into the task edit UI.

## Confirmed Good
- `as never` cast on `router.push('/goals/${id}')` — correct workaround for Expo Router typed route system
- Swipe gesture close-then-mutate pattern matches `TaskItem` exactly
- `targetDate` uses `+ 'T00:00:00'` local-midnight convention consistently with the timezone contract
- `useGoals`/`useCreateGoal`/`useUpdateGoal`/`useDeleteGoal` hooks follow the exact tasks.ts pattern
- Edit-diffing in `saveEdit` (only send changed fields) is consistent with TaskItem
- `GOALS_QUERY_KEY` invalidation wired correctly in all mutations
- `GoalsIcon` target/concentric-circles icon follows the existing icon construction pattern

## Fixes Applied
- Removed unused `index` param from `goals.tsx` keyExtractor
- Updated empty state copy to "No goals yet. Add one above."
