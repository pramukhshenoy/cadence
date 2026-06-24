# Cadence — Demo Issues Log

> Session date: 2026-06-24  
> Tester: Claude (automated) + user  
> Build: Expo Go 56.0.0, SDK 56, Metro dev server

---

## Issues Found

### ISSUE-001 — Expo Go APK install fails when emulator not fully booted
**Severity:** Low (workaround exists)  
**Screen:** App launch  
**Steps to reproduce:**
1. Start `npx expo start --android` within ~15 seconds of emulator booting
2. Expo CLI attempts to install Expo Go APK via adb while emulator is still in boot sequence

**Observed:** `adb install` fails with non-zero exit code  
**Expected:** APK installs cleanly  
**Workaround:** Expo Go was already present from a prior install. Deep-linking via `adb shell am start` to `exp://10.0.2.2:8081` after Metro is running works reliably.  
**Fix:** Wait for `adb shell getprop sys.boot_completed` to return `1` before running `npx expo start --android`.

---

### ISSUE-002 — Expo Dev Menu opens on first launch instead of app
**Severity:** Low (UX friction in demo)  
**Screen:** App first open  
**Steps to reproduce:**
1. Open Expo Go for the first time in a session
2. App bundle finishes loading

**Observed:** A "developer menu" sheet slides up before the user sees the app, explaining dev menu keyboard shortcuts.  
**Expected:** App goes straight to Dashboard  
**Impact:** Breaks the demo flow — audience sees a developer tool dialog before the app.  
**Fix (short-term):** Dismiss by tapping the X before demo. Consider using an EAS dev build (phase 4+) which does not show this dialog.

---

### ISSUE-003 — adb input tap coordinates don't match visual element positions
**Severity:** Medium (blocks automated testing)  
**Screen:** All screens  
**Details:**  
UIAutomator-reported element bounds differ significantly from visual element positions in screenshots. Example from Settings screen:

| Element | Visual y (est.) | UIAutomator y (actual) |
|---------|-----------------|------------------------|
| Bearer Token field | ~564 | 720 (centre) |
| Save button | ~684 | 877 (centre) |

The UIAutomator bounds are authoritative for touch input. **Always use `uiautomator dump` to find actual coordinates** before sending `adb shell input tap`.

**Bottom nav bar:** UIAutomator bounds are `[0,2126][216,2337]` per tab (y-centre = 2231), not at y≈2400 as the visual screenshot implies. All bottom tab navigation must use **y=2231**, not the visual bottom edge.

---

### ISSUE-004 — Save button unresponsive while TanStack Query retries are in flight
**Severity:** Medium (blocks first-time setup)  
**Screen:** Settings  
**Steps to reproduce:**
1. Open Settings tab (or navigate to it)
2. Immediately attempt to tap Save

**Observed:** Save button does not respond to taps  
**Root cause:** `isSaveDisabled = settingsLoading || modelsLoading`. On mount, both `/api/settings` and `/api/chat/models` fire immediately. Without a bearer token they return 401. With `retry: 2` configured, TanStack Query retries twice with backoff — keeping `isLoading: true` for ~4-5 seconds after each navigation to the Settings tab.  
**Expected:** Either the button shows a loading state visually, or its disabled state is communicated more clearly (opacity 0.4 on a nearly-black button is hard to distinguish).  
**Fix options:**
1. Lower or disable retry for the settings/models queries (they'll show empty state, not spin)
2. Make the disabled opacity more distinct (e.g., 0.3 or a grey colour)
3. Show a spinner inside the Save button while queries are loading

---

### ISSUE-005 — ANTHROPIC_API_KEY not set — AI Chat will fail
**Severity:** Critical (blocks core demo feature)  
**Screen:** Chat  
**Details:** `server/.env` has `ANTHROPIC_API_KEY=` with no value. The `/api/chat` endpoint will error when a message is sent.  
**Fix:** Add a valid Anthropic API key to `server/.env` before demo. The backend does not need to restart if the key is added and server is restarted.

---

### ISSUE-006 — Bearer token must be entered manually on every fresh emulator session
**Severity:** Medium (setup friction)  
**Screen:** Settings  
**Details:** The bearer token is stored in Android's EncryptedSharedPreferences (via Expo SecureStore). On a fresh emulator snapshot or after clearing app data, the token is lost and must be re-entered in Settings.  
**Workaround:** Document this as Step 4 in the runbook (already done). For demo repeatability, use the same emulator snapshot each time.  
**Fix (long-term):** Phase 6c onboarding screen handles this properly. Consider also accepting a default token from an env variable for local dev.

---

### ISSUE-007 — AI Model selector hidden until auth succeeds
**Severity:** Low (expected behaviour, but confusing)  
**Screen:** Settings  
**Details:** The AI Model radio buttons only appear after `/api/chat/models` returns a 200. Without a valid bearer token set, the model list area is blank — the Settings screen looks incomplete.  
**Expected for demo:** Explain this in the demo script — the model options appear after the token is saved and the screen is revisited.

---

### ISSUE-008 — Bottom tab navigation labels not rendering ✅ FIXED
**Severity:** Low (cosmetic)  
**Screen:** All screens  
**Details:** The bottom tab bar was showing icons but no labels for unselected tabs. Root cause: `NativeTabs` from `expo-router/unstable-native-tabs` only renders labels for the active tab on Android.  
**Fix applied:** Replaced `NativeTabs` with standard `Tabs` from `expo-router` in [app-tabs.tsx](../../app/src/components/app-tabs.tsx). Added distinct Ionicons per tab (outline for inactive, filled for active). All five tabs now always show labels.

---

### ISSUE-010 — GestureHandlerRootView missing — Tasks screen crashed on load ✅ FIXED
**Severity:** High (blocked Tasks screen entirely)
**Screen:** Tasks
**Details:** `TaskItem` uses `GestureDetector` from `react-native-gesture-handler` for swipe-to-edit/delete. Without `GestureHandlerRootView` wrapping the app root, the component throws at mount: *"GestureDetector must be used as a descendant of GestureHandlerRootView."* This crashed the entire Tasks screen to a black/empty view.
**Fix applied:** Added `GestureHandlerRootView style={{ flex: 1 }}` as the outermost wrapper in `app/src/app/_layout.tsx`, wrapping `QueryClientProvider` and the rest of the tree.
**Additional note:** The crash was previously hidden — without a valid bearer token the Tasks API returned 401 (`isError=true`) so TaskItem never mounted. Once the bearer token was configured, the list loaded and TaskItem mounted, triggering the crash.

---

## Backend API Test Results (via curl, 2026-06-24)

All endpoints tested with `Authorization: Bearer change-me-before-use` and `X-Timezone: Asia/Kolkata`.

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/health` | GET | ✅ 200 | `{"status":"ok"}` |
| `/api/settings` | GET | ✅ 200 | Returns `{"preferredModel":"claude-sonnet-4-6"}` |
| `/api/chat/models` | GET | ✅ 200 | Returns 3 Claude models (Sonnet 4.6, Haiku 4.5, Opus 4.8). OpenAI absent (key not set — correct). |
| `/api/tasks` | POST | ✅ 201 | Created "Demo task" HIGH priority |
| `/api/habits` | POST | ✅ 201 | Created "Morning walk" DAILY habit |
| `/api/habits/:id/complete` | POST | ✅ 200 | Logged completion for 2026-06-24 |
| `/api/chat` | POST | ⚠️ untested | Requires `ANTHROPIC_API_KEY` — skipped |

---

### ISSUE-009 — @expo/vector-icons v15 incompatible with React Compiler in Expo Go ✅ FIXED
**Severity:** High (blocked app from loading)  
**Screen:** All screens (Metro bundler error)  
**Details:** `@expo/vector-icons` v15 added `'use client'` to its module files. With `reactCompiler: true` in `app.json`, Expo SDK 56's Metro treats these as RSC boundaries and fails to resolve the `.ttf` font asset imports — even though the font file physically exists.  
**Error:** `None of these files exist: node_modules\@expo\vector-icons\build\vendor\react-native-vector-icons\Fonts\Ionicons.ttf`  
**Root cause:** `@expo/vector-icons/build/Ionicons.js` has `'use client'` directive → Metro RSC transform → binary asset resolution fails.  
**Fix applied:** Removed `@expo/vector-icons` dependency entirely from `app-tabs.tsx`. Replaced with self-contained inline icon components using React Native `View`/`Text` with Unicode characters — no external font files needed.  
**Additional note:** Expo Go also caches the error state. After fixing the code, `adb shell pm clear host.exp.exponent` is required to force Expo Go to fetch a fresh bundle.

---

## User Feedback

> *(Add feedback here as received)*
