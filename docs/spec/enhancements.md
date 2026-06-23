# Enhancements & Brainstorming

Ideas and improvements beyond the core build phases. Nothing here is committed to — pick these up when the app is stable.

---

## Background Calendar Sync (Cron-like)

**Problem**: The current design syncs the calendar only when the app is opened. If you don't open the app one morning, focus blocks won't be rescheduled.

**Solution**: Use `expo-background-fetch` + `expo-task-manager` to register a background task that Android wakes periodically (every 2–4 hours) to run the calendar sync — even when the app is closed. This brings back the "nightly reschedule" behavior without needing the Google Calendar API.

**How it would work:**
1. Register a background fetch task in the app at startup
2. Android wakes the task on its own schedule (frequency is a request, not a guarantee — Android may throttle it)
3. Task reads calendar via `expo-calendar`, POSTs to backend, writes new focus blocks back
4. Runs silently with no UI

**Caveats:**
- Android background task frequency is not guaranteed — battery optimization may delay it
- More reliable on devices with battery optimization disabled for the app
- Works well enough for a personal always-on use case

**Effort:** Medium — 1–2 days to wire up reliably with proper error handling.

---

## AI-Powered Task Prioritization

Let the AI analyze your task list + calendar + sleep data and suggest which tasks to work on this week and in what order. Could surface as a "Week Plan" card on the dashboard generated each Monday morning.

---

## Natural Language Task Creation via Chat

Allow the chat to create, update, or complete tasks directly. e.g., "Add a task to finish the design doc by Friday, high priority." The AI uses tool calls to write to the backend instead of just replying with text.

---

## Focus Block Task Linking

When the scheduling algorithm creates a focus block, let the user (or AI) suggest which task the block should be linked to based on priority and due date. Show the linked task title in the calendar event description.

---

## Weekly Review Summary

Every Sunday evening, the AI generates a brief summary: tasks completed, habits streak, focus hours logged, sleep average. Delivered as a push notification or visible on the dashboard.

---

## Habit Streaks & Nudges

Push notification nudges if a habit hasn't been completed by a configurable time (e.g., "You haven't logged your workout yet today"). Streak milestones shown on the dashboard.
