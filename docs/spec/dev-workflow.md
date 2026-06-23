# Development Workflow

## Responsibilities

| Area | Claude | You |
|---|---|---|
| Write all code | ✓ | |
| Backend testing & API tests | ✓ | |
| Business logic unit tests | ✓ | |
| UI testing — emulator (logs, startup, navigation) | ✓ (limited) | |
| UI testing — visual layout and interactions | | ✓ |
| UI testing — physical phone (Phases 4 & 5) | | ✓ |
| Code review (Sonnet + Opus) | ✓ | |
| Apply review fixes | ✓ | |
| Approve phase before moving on | | ✓ |
| Provide API keys & credentials | | ✓ |

> **Note on emulator testing:** Claude can launch the emulator, read logs, and verify startup/navigation flows. Claude cannot tap through screens or verify visual rendering — that requires a human.

---

## Testing Setup

### Android Emulator (Phases 1–3 and 6)

1. Install **Android Studio** (see `setup.md`)
2. Create a Pixel 8 AVD, API 35
3. Start the emulator
4. `npx expo start` in `app/` → press `a`

Backend address from emulator: `http://10.0.2.2:3000` (always maps to host localhost).

### Physical Phone with EAS Dev Build (Phases 4 & 5)

`expo-calendar` and `react-native-health-connect` require a **development build**, not Expo Go.

1. Build the dev-client APK: `eas build -p android --profile development`
2. Install APK on your physical Android phone
3. Connect via Tailscale (see `setup.md`) — backend URL: `http://100.x.x.x:3000`
4. `npx expo start` → dev-client on phone connects automatically

Health Connect cannot be tested on the emulator. A physical device with a real sleep tracker synced to Health Connect is required.

---

## End-of-Sub-Phase Quality Gate

At the end of every sub-phase, the following runs automatically in order — without input from you:

```
Sub-phase Na complete
    │
    ├── 1. Run tests (Jest + tsc --noEmit + ESLint)
    │        └── saved to docs/reviews/phase-N/Na-tests-YYYY-MM-DD.md
    │
    ├── 2. Sonnet code review → findings saved
    │        └── docs/reviews/phase-N/Na-sonnet-YYYY-MM-DD.md
    │
    ├── 3. Apply ALL Sonnet fixes to code
    │
    ├── 4. Opus code review on the already-fixed code (catches new/deeper issues only)
    │        └── docs/reviews/phase-N/Na-opus-YYYY-MM-DD.md
    │
    ├── 5. Apply Opus fixes to code
    │
    ├── 6. Fixes summary saved
    │        └── docs/reviews/phase-N/Na-fixes-YYYY-MM-DD.md
    │
    ├── 7. git commit: `phase-Na: description`
    │
    └── 8. git push (if remote configured)
```

You review the fixes summary and confirm before the next sub-phase begins.

**Why Sonnet first?** Fixing Sonnet findings before invoking Opus means Opus reviews already-improved code — it finds deeper issues rather than re-flagging what Sonnet already caught. This makes the Opus review more valuable.

**Time cost:** ~15–20 minutes per sub-phase gate.

### Reviews Folder Structure

```
docs/reviews/
├── spec/                         ← pre-implementation spec reviews
│   ├── spec-sonnet-YYYY-MM-DD.md
│   ├── spec-opus-YYYY-MM-DD.md
│   └── spec-fixes-YYYY-MM-DD.md
├── phase-1/                      ← one folder per phase
│   ├── 1a-tests-YYYY-MM-DD.md
│   ├── 1a-sonnet-YYYY-MM-DD.md
│   ├── 1a-opus-YYYY-MM-DD.md
│   ├── 1a-fixes-YYYY-MM-DD.md
│   └── ...
├── phase-2/
└── ...
```

### Review File Format

Each file contains:
- Date, phase, and sub-phase
- What was run / reviewed
- Full findings (file, line, issue, severity)
- What was fixed vs. deferred
- Pass / Fail verdict

---

## Deployment

### Backend (local PC)

```bash
cd server
npm install
npx prisma migrate dev     # creates SQLite DB and seeds Settings singleton
npm run dev                # hot reload
```

**Always-on (no terminal):**
```bash
npm run build
pm2 start dist/index.js --name ai-assistant-server
pm2 startup
```

### Mobile — Development

```bash
cd app
npx expo start
# Phases 1–3: press 'a' for emulator
# Phases 4–5: dev-client on physical phone connects automatically
```

### Mobile — Production APK

```bash
eas build -p android --profile preview   # ~10 min cloud build
# Download .apk → sideload (Settings → Install unknown apps)
```

No Play Store needed — personal use.

---

## Sub-Phase Checklist Template

- [ ] Code written
- [ ] TypeScript compiles (`tsc --noEmit` in both `/app` and `/server`)
- [ ] ESLint passes
- [ ] Unit/API tests written and passing
- [ ] Tested on emulator (sub-phases 1–3, 6) or physical phone with dev build (sub-phases 4–5)
- [ ] Sonnet review run → results saved
- [ ] Sonnet findings applied
- [ ] Opus review run on fixed code → results saved
- [ ] Opus findings applied
- [ ] Fixes summary saved
- [ ] `git commit` with message `phase-Na: description`
- [ ] `git push` (if remote configured)
- [ ] You approved → next sub-phase begins

## Git Remote Setup (one-time, your step)

```bash
# After Phase 1a initialises the repo:
git remote add origin <your-github-repo-url>
git push -u origin main
# Subsequent pushes: git push
```

---

## Monorepo Tooling Layout

```
ai-assistant/
├── package.json          # root — shared scripts only (e.g., lint:all)
├── app/
│   ├── package.json      # Expo / React Native deps
│   ├── tsconfig.json     # RN target: extends expo/tsconfig.base
│   └── .eslintrc.js      # RN rules (react-native community config)
└── server/
    ├── package.json      # Node / Express deps
    ├── tsconfig.json     # Node target: module commonjs, strict
    └── .eslintrc.js      # Node rules (no RN-specific rules)
```
