# Phase 7c Opus Review — 2026-06-27

## Files Reviewed
- `app/src/types/task.ts`, `app/src/lib/tasks.ts`
- `app/src/components/task-add.tsx`, `app/src/components/task-item.tsx`
- `app/src/app/tasks.tsx`, `app/src/app/goals/[id].tsx`

## Findings

### MEDIUM (acknowledged, no fix needed)

**1. Goal chip selector only shows ACTIVE goals — can't re-link to completed goals**
`task-item.tsx` edit mode renders only `activeGoals` (ACTIVE status). Existing task linked to a completed goal shows the current goal in the view badge, but the edit mode only offers active goals and a "✕ None" unlink option.
- **Decision:** Intentional design. Linking tasks to completed/abandoned goals is not a useful workflow. Users who want to reopen a goal do so via the goal detail screen, not via task editing.

**2. View badge may flicker on initial load (TanStack cache miss)**
If `useGoals()` hasn't resolved, `allGoals = []` so `linkedGoal` is null and the badge doesn't show until data arrives.
- **Decision:** Acceptable for a personal app. TanStack persists cache in memory; flicker only on cold start. Not fixed.

### LOW (no fix needed)

**3. Truncation length inconsistency** — chip labels truncate at 18+… chars, view badge at 22+… chars. Intentional (different space budgets).

**4. Double invalidation per mutation** — tasks + goals invalidated on every task create/update/delete. Correct for maintaining goal progress accuracy. TanStack deduplicates concurrent refetches.

## Confirmed Correct
- `preselectedGoalId ?? selectedGoalId ?? null` precedence is correct
- `showGoalSelector = preselectedGoalId === undefined && activeGoals.length > 0` correctly hides selector in goal detail context
- `saveEdit` diffing includes `editGoalId !== task.goalId`
- `openEdit` resets `editGoalId` from `task.goalId` (current saved state)
- `selectedGoalId` and `editGoalId` reset on cancel/dismiss
- 4-param `onAdd` signature is backward-compatible (goals/[id].tsx handler with 3 params works in TypeScript)
- `useGoals()` returns all statuses — view badge correctly shows for tasks linked to completed goals

## All Fixes Applied
No fixes required. tsc and ESLint both clean (0 errors).
