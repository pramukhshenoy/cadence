# Phase 7c Sonnet Self-Review — 2026-06-27

## Files Reviewed
- `app/src/types/task.ts`
- `app/src/lib/tasks.ts`
- `app/src/components/task-add.tsx`
- `app/src/components/task-item.tsx`
- `app/src/app/tasks.tsx`
- `app/src/app/goals/[id].tsx`

## Findings

### No issues found

**Circular import check:** `tasks.ts` imports `GOALS_QUERY_KEY` from `goals.ts`. `goals.ts` does not import from `tasks.ts`. No circular dependency. ✓

**Type safety:** `onAdd` signature changed to include 4th `goalId: string | null` param. `goals/[id].tsx` `handleAddTask` has only 3 params — TypeScript allows functions with fewer params to satisfy a type expecting more. ✓

**`useGoals()` scope:** Returns all goals (no status filter on backend). `linkedGoal` in view mode correctly finds goals of any status — badge shows for tasks linked to completed goals. ✓

**`showGoalSelector` gating:** `preselectedGoalId === undefined` (not `=== null`) means passing `goalId={null}` would still show the selector (unexpected). However, no caller passes `null` — goal detail passes `goalId={id}` (string) and tasks screen doesn't pass the prop (undefined). Safe as-is.

**`saveEdit` diff:** `editGoalId !== task.goalId` correctly detects changes including `null → "abc123"` and `"abc123" → null`. ✓

**Goal cache invalidation:** All three task mutations now invalidate both `TASKS_QUERY_KEY` and `GOALS_QUERY_KEY`. Task status changes and goal linking both affect goal progress bars — invalidation is correct. ✓

## Confirmed Good
- `selectedGoalId` state reset on both `submit()` and `dismiss()` — no stale selection leak
- `editGoalId` reset in `openEdit()` from `task.goalId` — edit reflects current saved state
- "✕ None" chip only shown when `editGoalId !== null` — clean UX
- Goal selector in AddTask hidden when `goalId` prop provided (goal detail context)
- `preselectedGoalId ?? selectedGoalId ?? null` precedence correct

## Fixes Applied
None required.
