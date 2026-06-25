# Phase 4d — Sonnet Review

Date: 2026-06-25

## Findings

### PLAUSIBLE — Fixed

**C1**: `shortfallHours >= 0.1` threshold (index.tsx)
- A float like `0.01` would trigger `> 0` and render as `"0.0h shortfall"`.
- Fix: changed guard to `>= 0.1` (6-minute floor).

**C2**: Sequential DB calls in `/week-summary` (focus-blocks.ts route)
- `getSettings` and `focusBlock.findMany` had no ordering dependency.
- Fix: wrapped in `Promise.all`.

**C4**: `useFocusWeekSummary` never invalidated after calendar sync (use-calendar-sync.ts)
- After sync completed, dashboard showed stale scheduled hours.
- Fix: added `queryClient.invalidateQueries({ queryKey: FOCUS_WEEK_SUMMARY_KEY })` after sync writes.

### REFUTED

- `targetHours` raw interpolation (C3): `focusHoursPerWeek` is stored/retrieved without arithmetic; IEEE 754 drift not realistic.
- Next-Monday `sd+1` fragile (C5): `Date.UTC` overflow normalisation is standard JS behavior.
- Rolling vs ISO week mismatch (C4-rolling): pre-existing from phase 4c, not introduced here.
