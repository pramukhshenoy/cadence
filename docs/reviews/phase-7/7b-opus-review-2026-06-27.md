# Phase 7b Opus Review — 2026-06-27

## Files Reviewed
- `app/src/types/goal.ts`, `app/src/lib/goals.ts`, `app/src/types/task.ts`
- `app/src/components/goal-add.tsx`, `app/src/components/goal-item.tsx`
- `app/src/app/goals.tsx`, `app/src/app/goals/[id].tsx`
- `app/src/components/app-tabs.tsx`, `app/src/components/app-tabs.web.tsx`

## Findings

### HIGH

**1. Goals screens have no SafeAreaView — content renders under the status bar**
`goals.tsx` and `goals/[id].tsx` used bare `<View>` as root with `headerShown: false` (global Tabs setting). On device, content collides with notch/status bar. Every other content screen wraps in `<SafeAreaView edges={['top']}>`.
- **Fix applied:** `goals.tsx` wraps in `<ThemedView>` + `<SafeAreaView edges={['top']}>` with a "Goals" title header matching the Tasks screen pattern.
- **Fix applied:** `goals/[id].tsx` renders a `<SafeAreaView edges={['top']}>` above the FlatList with a "← Goals" back button.

**2. Detail screen has no back navigation affordance**
`goals/[id].tsx` is a hidden Tabs screen with `headerShown: false`. The `router.back()` link only appeared in the "Goal not found" error branch. Users had no visible way to return to the Goals list.
- **Fix applied:** Added a `<Pressable onPress={() => router.back()}>` "← Goals" button at the top of the detail screen, rendered inside the SafeAreaView above the FlatList.

### MEDIUM

**3. Empty state copy misleading**
`goals.tsx` showed "No active goals." which implies active-only filter, but the state is actually "no goals at all." Fixed by Sonnet review — see 7b-sonnet-review.

**4. "None yet" label based on visibleTasks instead of goalTasks**
`goals/[id].tsx` showed "Tasks — none yet" when `visibleTasks.length === 0`, which fires when all tasks are DONE and `showCompleted = false`. A goal with completed tasks appeared empty.
- **Fix applied:** Changed condition to `goalTasks.length === 0` — "none yet" only when no tasks exist at all.

**5. showCompleted toggle hidden for non-active goals**
`hasCompleted && goal.status === 'ACTIVE'` gate meant the toggle was invisible for COMPLETED/ABANDONED goals, stranding their done tasks with no way to reveal them.
- **Fix applied:** Removed the `goal.status === 'ACTIVE'` condition — toggle now shows whenever `hasCompleted` is true, regardless of goal status.

### LOW (not fixed — acceptable for personal app)

**6. keyExtractor unused `index` param** — fixed by Sonnet review.

**7. Velocity `Math.round(days / 30)` months rounding** — cosmetic edge case, acceptable.

**8. Hardcoded `#22C55E` green for velocity** — consistent with priority/status color pattern elsewhere.

**9. `app-tabs.web.tsx` not updated** — app is Android-only per CLAUDE.md, out of scope.

## Confirmed Good
- `as never` cast for Expo Router dynamic routes
- Swipe gesture pattern matches TaskItem exactly
- `targetDate + 'T00:00:00'` timezone convention
- Edit-diffing only sends changed fields
- Goal type definitions align with backend computed fields

## All Fixes Applied
tsc and ESLint re-run after fixes — both clean (0 errors).
