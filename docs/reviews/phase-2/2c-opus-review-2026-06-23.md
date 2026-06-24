# Phase 2c Opus Review — 2026-06-23

## Findings

### [FIX — applied] task-item.tsx: right swipe (delete) didn't call close() before delete
`onSwipeableOpen` for the 'right' direction (swipe left → delete) called `onDelete` without first
calling `swipeable.current?.close()`. If the delete fails, the row stays open with no way to reset.
**Fix**: moved `swipeable.current?.close()` before the direction branch so both paths close first.

### [FIX — applied] task-item.tsx: ISO date comparison ignores time component
`isOverdue` and `formatDue` called `new Date(iso)` without normalising to local midnight. A server
ISO timestamp like `2026-06-23T15:00:00.000Z` would fail `isSameDay` comparisons for the current
local date. A date-only string `"2026-06-23"` parses as UTC midnight and can appear as the previous
local day in UTC+N timezones, mislabelling "today" tasks as Overdue.
**Fix**: extracted `toLocalMidnight(iso)` helper that calls `d.setHours(0,0,0,0)` after parsing —
both comparison functions now use it.

### [FIX — applied] task-item.tsx: swipe gesture not disabled during inline edit
While `editing=true` the row is still swipeable. A stray right-swipe from trying to scroll
horizontally will complete or delete the task mid-edit.
**Fix**: added `enabled={!editing}` prop to `ReanimatedSwipeable`.

### [FIX — applied] task-add.tsx: whitespace-only submit collapsed the add form
`submit()` called `dismiss()` on empty input, which set `expanded=false` and dismissed the keyboard.
Users typing then backspacing would lose the open form unexpectedly.
**Fix**: changed to `if (!trimmed) return;` — empty submit does nothing, form stays open.

## No-action notes
- tasks.tsx: null `dueDate` is already bucketed into "No Due Date" section — verified OK.
- lib/tasks.ts: no optimistic update. Acceptable for a single-user personal app. A failed mutation
  currently produces no visible feedback — a future polish pass (Phase 6) should add error toasts.
- task-item.tsx: `editTitle`/`editPriority` initialised from `task` at mount but re-seeded in
  `openEdit()` — verified the stale-props scenario is safe.
