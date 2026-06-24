# Cadence

Personal Android app for managing tasks, habits, calendar focus blocking, and sleep-aware rescheduling. Primary interaction is through an AI chat interface.

## Starting the app

Use `start.ps1` from the repo root in a PowerShell terminal.

### Phases 1–3 (Expo Go, emulator)

```powershell
.\start.ps1
```

Starts the backend server, launches the Pixel 8 emulator, and opens the app via Expo Go. No native modules required.

### Phase 4+ (dev client, physical device)

`expo-calendar` and `react-native-health-connect` are native modules that don't run in Expo Go. You need a dev client APK installed on your physical Android phone.

**First time only — build the APK:**

```powershell
.\start.ps1 -Build
```

This triggers an EAS cloud build (`eas build -p android --profile development`), which takes around 10 minutes. When it finishes, download and install the APK on your phone. You only need to rebuild when native dependencies change.

**Day-to-day development:**

```powershell
.\start.ps1 -DevBuild
```

Skips the emulator, starts the backend, and runs Metro in `--dev-client` mode. Open the dev client app on your phone — it connects to Metro over Tailscale automatically.

> Make sure Tailscale is running on both your PC and phone, and the backend URL in the app's Settings is set to your PC's Tailscale IP (`http://100.x.x.x:3000`).

## Project docs

| File | Contents |
|------|----------|
| [PLAN.md](PLAN.md) | Current phase status |
| [docs/spec/phases.md](docs/spec/phases.md) | Full phase checklists |
| [docs/spec/architecture.md](docs/spec/architecture.md) | System diagram and tech stack |
| [docs/spec/features.md](docs/spec/features.md) | Feature requirements |
| [docs/spec/setup.md](docs/spec/setup.md) | EAS builds, Health Connect, Tailscale |
