# Spec Review — Sonnet (claude-sonnet-4-6)
**Date:** 2026-06-22  
**Scope:** All files in `docs/spec/`  
**Verdict:** NEEDS FIXES — 4 high, 5 medium, 3 low

---

## HIGH — Functional gaps or contradictions

### 1. Sleep quality boundary overlap
**File:** `docs/spec/features.md:64`  
Poor defined as `< 6.5h`, Fair as `6–7h`. A sleep of 6.2h satisfies both. The ranges overlap between 6.0–6.5h.  
**Fix:** Redefine as Poor `< 6.5h`, Fair `6.5–7h`, Good `≥ 7h`.

### 2. No mechanism to identify app-created focus blocks
**File:** `docs/spec/features.md:51`, `docs/spec/phases.md:29`  
The re-scheduling flow says "App deletes stale future focus blocks" but does not say how the app distinguishes its own blocks from other calendar events. The `deviceCalendarEventId` list in SQLite is the source of truth — the flow must explicitly say: query SQLite for known focus block IDs, then delete those events via expo-calendar.  
**Fix:** Add explicit step to the flow and phases checklist.

### 3. AI Chat claims to add tasks but no tool use defined
**File:** `docs/spec/features.md:29`  
"The AI can help: add tasks" implies Claude writing to the backend via tool use / function calling. The chat endpoint is described only as a conversational proxy — no tools are defined.  
**Fix:** Either (a) define tool use in Phase 3 for task creation, or (b) clarify that Phase 3 is conversational-only and task actions come in a later phase.

### 4. Server URL config missing from early phases
**File:** `docs/spec/phases.md`  
The onboarding screen (where server URL is configured) is in Phase 6. Phases 1–5 all need the app to reach the backend. No mechanism exists to configure the URL until the final phase.  
**Fix:** Add a minimal server URL configuration step to Phase 1 (can be a hardcoded constant or a simple config screen stub).

---

## MEDIUM — Inconsistencies or missing detail

### 5. FocusBlock.date redundant with startTime
**File:** `docs/spec/data-model.md:36`  
`startTime` is a `DateTime` that already encodes the date. The separate `date` field duplicates this and can diverge.  
**Fix:** Remove `date` field. Derive date from `startTime` at query time.

### 6. HabitCompletion missing cascade delete
**File:** `docs/spec/data-model.md:29`  
Deleting a `Habit` leaves orphaned `HabitCompletion` rows. Prisma requires explicit `onDelete: Cascade` on the relation.  
**Fix:** Add `onDelete: Cascade` to the HabitCompletion → Habit relation.

### 7. setup.md backend URL section outdated
**File:** `docs/spec/setup.md:50`  
Still references "Set the server's local IP... `http://192.168.1.x:3000`". This predates the emulator (`10.0.2.2:3000`) and Tailscale decisions made in dev-workflow.md.  
**Fix:** Replace with the two-scenario description: emulator uses `10.0.2.2:3000`, physical phone uses Tailscale IP.

### 8. Dashboard "used" focus time undefined
**File:** `docs/spec/features.md:6`  
Widget shows "scheduled vs. used" but there is no defined mechanism to mark a focus block as used/completed.  
**Fix:** Reframe as "scheduled vs. elapsed" — past focus blocks (endTime < now) are automatically counted as elapsed, requiring no user action.

### 9. Health Connect shown as external in architecture diagram
**File:** `docs/spec/architecture.md:13`  
Health Connect appears below the app box with a downward arrow, resembling a cloud service. It is on-device.  
**Fix:** Bring Health Connect inside the app box or annotate the arrow explicitly as "(on-device)".

---

## LOW — Minor issues

### 10. Claude UI testing capability overstated
**File:** `docs/spec/dev-workflow.md:10`  
Responsibilities table shows Claude ✓ for "UI testing (emulator)". Claude can run the emulator and inspect logs but cannot tap through screens or verify visual rendering.  
**Fix:** Change to "UI testing (emulator) — logs & startup only" with a note that visual layout verification is manual.

### 11. Emulator setup not listed as Phase 1 prerequisite
**File:** `docs/spec/phases.md:3`  
Phase 1 involves emulator testing but "Install Android Studio + set up AVD" is not listed anywhere as a step.  
**Fix:** Add as a prerequisite item in `setup.md`.

### 12. ChatMessage has no session concept
**File:** `docs/spec/data-model.md:54`  
All messages share a single flat history. No way to clear or start a new conversation without deleting all records.  
**Fix (deferred):** Known limitation, acceptable for Phase 3. Add a note in the data model. Can be revisited in Phase 6 polish.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| High     | 4     | To fix |
| Medium   | 5     | To fix |
| Low      | 3     | To fix (10, 11) / Deferred (12) |
