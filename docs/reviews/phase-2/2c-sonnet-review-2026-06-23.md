# Phase 2c Sonnet Review — 2026-06-23

## Files reviewed
- src/types/task.ts
- src/lib/tasks.ts
- src/components/task-item.tsx
- src/components/task-add.tsx
- src/components/filter-chips.tsx
- src/app/tasks.tsx

## Findings

### [FIX — applied] task-item.tsx: onBlur fires before Cancel press
`onBlur={saveEdit}` on the edit TextInput triggers a save when the Cancel button is tapped, because
the TextInput loses focus before the Pressable's onPress fires. This silently saves instead of cancelling.
**Fix**: removed `onBlur={saveEdit}`. Save is triggered only via keyboard submit or the Save button.

### [FIX — applied] lib/tasks.ts: redundant status check in useDeleteTask
`!res.ok && res.status !== 204` is redundant — HTTP 204 has `ok=true` so `!res.ok` is already false.
**Fix**: simplified to `if (!res.ok)`.

### [FIX — applied] tasks.tsx: bottom padding clips under tab bar on Android
`paddingBottom: Spacing.six` (64px) is less than the Android tab bar inset (80px from `BottomTabInset`).
Last items in the list will be hidden behind the tab bar.
**Fix**: changed to `BottomTabInset + Spacing.three` (96px on Android).

## No-action notes
- task-add.tsx: Tapping a priority chip while the title is empty collapses the form (onBlur → dismiss).
  Acceptable UX — the user should type a title before selecting priority.
- ReanimatedSwipeable: `swipeable.current?.close()` is called before the mutation resolves.
  If the list re-renders while the close animation runs, no crash occurs — React Native handles this.
- SectionSeparatorComponent gap: adds 8px space between groups. Looks correct.
- Client-side filtering: all tasks fetched then filtered in-memory. Fine for a personal single-user app.
