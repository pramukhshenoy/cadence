# Setup Guide

## Android Studio & Emulator (Phase 1 Pre-requisite)

Required for emulator-based UI testing in Phases 1–3 and 6.

1. Download and install **Android Studio**
2. Open **Device Manager** → Create Virtual Device → Pixel 8, API 35 (Android 15)
3. Start the emulator
4. Run `npx expo start` in `app/` → press `a` to open on emulator

The emulator connects to the backend via `http://10.0.2.2:3000` — this always maps to `localhost` on the host PC. No IP configuration needed.

---

## EAS Development Builds (Phase 4 Pre-requisite)

`expo-calendar` and `react-native-health-connect` are native modules not included in Expo Go. Phases 4 and 5 require a **development build**.

1. Create a free account at expo.dev
2. `npm install -g eas-cli && eas login`
3. `eas build -p android --profile development` — builds a dev-client APK in Expo's cloud (~10 min)
4. Install the APK on your physical Android phone
5. Run `npx expo start` → the dev-client app connects to the Metro bundler on your PC

---

## Calendar (expo-calendar)

No cloud setup required. `expo-calendar` reads and writes the device's local calendar database, which Android syncs automatically with Google Calendar.

**Android permissions** (requested at first launch):
- `READ_CALENDAR`
- `WRITE_CALENDAR`

**Calendar selection** (in onboarding):
- Choose which calendars to read from (for conflict detection)
- Choose a writable target calendar for focus blocks
- Or: let the app create a dedicated "AI Focus Blocks" local calendar

No API keys, no OAuth, no Google Cloud Console.

---

## Health Connect (Phase 5 Pre-requisite)

Health Connect is built into Android 14+. On Android 9–13, install it from the Play Store. Testing requires a **physical device** — the emulator cannot provide real Health Connect sleep data.

**Steps:**
1. Install **Health Connect** from the Play Store (if Android < 14)
2. Connect your sleep tracker to Health Connect (Google Fit, Samsung Health, Fitbit, etc.)
3. Grant the app sleep permissions when prompted on first launch

**Android permission:**
- `READ_SLEEP`

No API keys or cloud setup needed — Health Connect is fully on-device.

**Testing tip:** Ensure your sleep tracker has synced to Health Connect before opening the app in the morning. Tracker sync lag is typically a few minutes but can take longer.

---

## Physical Phone Connection (Phases 4 & 5)

**One-time Tailscale setup:**
1. Install Tailscale on your PC: tailscale.com/download
2. Install Tailscale on your Android phone (Play Store)
3. Sign in with the same account on both
4. Your PC gets a stable Tailscale IP (e.g., `100.x.x.x`) that never changes
5. Set the backend URL in the app Settings to `http://100.x.x.x:3000`

This replaces any local Wi-Fi IP — works across networks, no reconfiguration needed.

---

## Backend Server

Runs locally on your Windows PC.

**Environment variables** — create `server/.env`:

```
PORT=3000
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=
OPENAI_API_KEY=          # optional
API_BEARER_TOKEN=        # any strong random string; must match what's stored in the app's SecureStore
```

**Start:**
```bash
cd server
npm install
npx prisma migrate dev   # creates SQLite DB and seeds Settings singleton
npm run dev              # hot reload with ts-node-dev
```

**Always-on (no terminal window):**
```bash
npm install -g pm2
npm run build            # compile TypeScript
pm2 start dist/index.js --name ai-assistant-server
pm2 startup              # auto-start on PC reboot
```
