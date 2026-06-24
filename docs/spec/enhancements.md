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

## Natural Language Task & Habit Creation via Chat

Allow the chat to create, update, or complete tasks and habits directly via AI tool calls. Examples:
- "Add a task to finish the design doc by Friday, high priority."
- "Create a daily habit to meditate every morning."
- "Mark my workout habit as done for today."

The AI uses tool calls to write to the backend instead of just replying with text. Tool definitions would cover: `createTask`, `updateTask`, `completeTask`, `createHabit`, `logHabitCompletion`. The system prompt already has full task/habit context, so the AI has what it needs to act accurately.

**Effort:** Medium — tool definitions + backend routes are straightforward; the main work is prompt engineering to avoid hallucinated writes.

---

## Focus Block Task Linking

When the scheduling algorithm creates a focus block, let the user (or AI) suggest which task the block should be linked to based on priority and due date. Show the linked task title in the calendar event description.

---

## Weekly Review Summary

Every Sunday evening, the AI generates a brief summary: tasks completed, habits streak, focus hours logged, sleep average. Delivered as a push notification or visible on the dashboard.

---

## Habit Streaks & Nudges

Push notification nudges if a habit hasn't been completed by a configurable time (e.g., "You haven't logged your workout yet today"). Streak milestones shown on the dashboard.

---

## Goals (Long-Term Goal Tracking)

A Goal is a long-term objective (e.g., "Learn Spanish", "Run a marathon") that acts as a container for related Tasks and an optional linked Habit.

**Data model additions:**
- `Goal`: title, description, targetDate (optional), status (Active/Completed/Abandoned), priority
- `Task` gets an optional `goalId` foreign key to link child tasks to a goal

**Progress:** % of child tasks completed + velocity (tasks completed this week). No streaks on the goal itself — attach a linked Habit for daily consistency tracking instead.

**App structure:** Goals as a dedicated top-level tab. Each goal shows its task list, progress bar, linked habit streak (if any), and target date countdown.

**Chat integration:** Once the Chat write enhancement is in place, the AI can break a new goal down into a suggested task list ("Set up Learn Spanish goal with these 5 tasks?") and answer progress questions ("How am I doing on my marathon goal?").

**Effort:** Medium-High — new model + migration, new tab UI, goal-task linking in task create/edit screens, system prompt context update for Chat.
