# Cadence — Demo Runbook

> Last updated: 2026-06-24  
> Tested on: Pixel 8 AVD (API 35), Expo Go, Android Studio

---

## Prerequisites

| Requirement | Where to check |
|-------------|----------------|
| Node.js ≥ 18 | `node -v` |
| Android Studio + Pixel 8 AVD (API 35) | Android Studio → Virtual Device Manager |
| Expo CLI (`npx expo`) | included via `app/node_modules` |
| `server/.env` fully populated | see below |

### `server/.env` must have all four values set

```env
PORT=3000
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=sk-ant-...   # required for AI Chat
OPENAI_API_KEY=                 # optional — leave blank to hide OpenAI model in app
API_BEARER_TOKEN=change-me-before-use
```

---

## Step 1 — Start the Android Emulator

Open **Android Studio → Device Manager** and click the play button on the **Pixel 8** AVD, or run:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_8
```

Verify it appears in ADB:
```bash
adb devices
# emulator-5554   device
```

---

## Step 2 — Start the Backend Server

```bash
cd server
npm run dev
```

Expected output:
```
Server running on port 3000
```

Smoke-test:
```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

---

## Step 3 — Start the Expo App on Android

```bash
cd app
npx expo start --android
```

- Expo will bundle and automatically install on the running emulator.
- First install takes ~60–90 seconds. Subsequent starts are faster with the Metro cache.
- Press `a` in the Expo CLI terminal to send to Android if auto-open doesn't trigger.

---

## Step 4 — Configure the App (First Run Only)

The app ships with no bearer token pre-loaded. On first run:

1. Open the **Settings** tab (bottom navigation, rightmost icon).
2. **Bearer Token** field: type `change-me-before-use` (must match `API_BEARER_TOKEN` in `server/.env`).
3. **Server URL**: leave as default `http://10.0.2.2:3000` (emulator routes this to host `localhost:3000`).
4. Tap **Save**.

After saving, navigate to any other tab and back — the token is now stored in SecureStore and will persist across restarts.

---

## Step 5 — Demo Script

### 5.1 Dashboard
- Open the app — the **Dashboard** tab is the landing screen.
- Shows two cards: **Tasks due today** and **Habits for today**.
- Empty on first run; populate via Tasks and Habits tabs first.

### 5.2 Tasks
1. Tap the **Tasks** tab.
2. Tap the **+** button to create a task — enter a title, set a priority and optional due date.
3. Swipe right on a task to **complete** it; swipe left to **delete**.
4. Use the filter bar to switch between All / Active / Completed views.
5. Return to Dashboard — the tasks-due-today card now reflects the data.

### 5.3 Habits
1. Tap the **Habits** tab.
2. Create a habit (e.g. "Morning walk", daily target).
3. Tap the checkbox to **complete** today's habit — streak counter increments.
4. Return to Dashboard — the habits card shows today's completion state.

### 5.4 AI Chat
1. Tap the **Chat** tab.
2. Type a message — e.g. *"What should I focus on today?"*
3. The assistant streams a response that references your actual tasks and habits.
4. Tap the **New conversation** button (top right) to start a fresh context.
5. The model selector in Settings controls which Claude model responds.

### 5.5 Settings
1. Change the **AI Model** to a different Claude variant and tap Save.
2. Send a chat message — the new model is used immediately.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| App shows "Network error" on any screen | Bearer token not set in Settings | Go to Settings, enter `change-me-before-use`, tap Save |
| Chat replies with "AI provider not configured" | `ANTHROPIC_API_KEY` empty in `.env` | Add key to `server/.env`, restart server |
| Dashboard cards empty even after adding data | Bearer token mismatch | Settings → re-enter token exactly as in `server/.env` |
| Expo won't connect to backend | Wrong API URL in Settings | Reset to `http://10.0.2.2:3000` |
| `adb devices` shows no device | Emulator not started | Launch from Android Studio → Device Manager |

---

## Restarting from Clean State

```bash
# Stop everything (Ctrl+C in each terminal), then:
cd server
npx prisma migrate reset --force   # wipes DB and re-seeds Settings row
npm run dev

# New terminal:
cd app
npx expo start --android
```

Bearer token must be re-entered in Settings after a DB reset only if the `API_BEARER_TOKEN` env var changed.
