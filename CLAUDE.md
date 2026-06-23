# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# General Instructions
1. Ask, don't assume. If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements. When running unattended, pick the most reasonable interpretation, proceed, and record the assumption rather than blocking.

2. Implement the simplest solution for simple problems, better solutions for harder problems. Do not over-engineer or add flexibility that isn't needed yet. 

3. Don't touch unrelated code but please do surface bad code or design smells you discover with me so we can address them as a separate issue.

4. Flag uncertainty explicitly. If you're unsure about something, see point 1 above. If it makes sense to do so, conduct a small, localised and low-risk experiment and bring the hypothesis and results to me to discuss. Confidence without certainty causes more damage than admitting a gap.

5. I'm always open to ideas on better ways to do things. Please don't hesitate to suggest a better way, or one that has long lasting impact over a tactical change. (as a few examples)

# Cadence — Project Context

Personal Android app (single user). Primary interaction is through an AI chat interface. Manages tasks, habits, calendar focus blocking, and sleep-aware rescheduling.

## Read these before touching any code

- `PLAN.md` — index and current status (which sub-phase is next)
- `docs/spec/phases.md` — all phases broken into sub-phases with checklists
- `docs/spec/dev-workflow.md` — quality gate, review order, git commit pattern
- `docs/spec/features.md` — full feature requirements
- `docs/spec/data-model.md` — Prisma schema and timezone contract
- `docs/spec/architecture.md` — system diagram, tech stack, env vars
- `docs/spec/setup.md` — emulator, EAS builds, Tailscale, Health Connect

## Tech stack (summary)

- **Mobile**: Expo (React Native, Android) + TypeScript + NativeWind + Expo Router
- **Backend**: Node.js + Express + TypeScript + Prisma + SQLite (local PC)
- **Calendar**: `expo-calendar` (on-device, no API keys)
- **Health**: `react-native-health-connect` (on-device, Android only)
- **AI**: Anthropic Claude via SDK, proxied through backend (never expose key to app)
- **Chat streaming**: SSE — custom hook, NOT TanStack Query
- **Auth**: Bearer token between app and backend (stored in Expo SecureStore)

## Commands

### Backend
```bash
cd server
npm install
npx prisma migrate dev     # creates SQLite DB and seeds Settings row
npm run dev                # hot reload via ts-node
npm run build && npm start # production
tsc --noEmit               # type check only
npx eslint .               # lint
npx jest                   # unit + API tests
```

### Mobile
```bash
cd app
npm install
npx expo start             # then press 'a' to open on Android emulator
tsc --noEmit               # type check only
npx eslint .               # lint
```

Backend is reachable from the Android emulator at `http://10.0.2.2:3000` (maps to host localhost).

### Root (runs both)
```bash
npm run lint:all           # eslint on app/ and server/
npm run typecheck:all      # tsc --noEmit on app/ and server/
```

## Non-obvious decisions (apply these without being asked)

- Every request includes `X-Timezone` header (device IANA timezone). Backend uses this for all local-time math.
- Habit completions stored as `"YYYY-MM-DD"` string, not DateTime — avoids UTC boundary issues with streaks.
- Focus blocks identified by `calendarMarker` UUID stored in the calendar event notes field (not the title — user may rename).
- `FocusBlock.status` (ACTIVE/DELETED) is the source of truth for cleanup — never guess which events are ours by title.
- Phases 4 and 5 require an EAS development build (`expo-dev-client`). Expo Go cannot run `expo-calendar` or `react-native-health-connect`.
- Backend binds bearer token auth from Phase 1. Every endpoint (except `/health`) must validate the token.
- `Settings` singleton row must be seeded in the Prisma migration — upsert-on-read as a safety net.
- Data fetching uses **TanStack Query** everywhere except the AI chat stream, which uses a custom SSE hook. Do not use TanStack Query for the chat endpoint.
- OpenAI is a secondary model option (hidden in app UI if `OPENAI_API_KEY` is absent). Anthropic Claude is always the default.

## End-of-sub-phase quality gate (automatic, no user input needed)

1. Run tests (Jest + `tsc --noEmit` + ESLint) → save to `docs/reviews/phase-N/Na-tests-DATE.md`
2. Sonnet review → save → **apply all Sonnet fixes**
3. Opus review on fixed code → save → **apply all Opus fixes**
4. Save fixes summary to `docs/reviews/phase-N/Na-fixes-DATE.md`
5. `git commit -m "phase-Na: description"` then `git push` (if remote set)
6. Update progress docs: tick sub-phase in `PLAN.md` and check off items in `docs/spec/phases.md`

Sonnet runs first so Opus reviews already-improved code and catches deeper issues only.

## Repo structure

```
ai-assistant/
├── app/        # Expo React Native
├── server/     # Node.js + Express
├── docs/
│   ├── spec/     # Planning docs (do not auto-edit during implementation)
│   └── reviews/  # Generated per sub-phase
├── CLAUDE.md   ← you are here
└── PLAN.md     # Index + current status
```
