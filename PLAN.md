# Cadence — Project Plan

Single-user Android app. Primary interaction is through an AI chat interface that is aware of your tasks, habits, calendar, and sleep.

## Docs

| File | Contents |
|------|----------|
| [docs/spec/architecture.md](docs/spec/architecture.md) | System diagram, tech stack, repo structure, deployment, env vars |
| [docs/spec/features.md](docs/spec/features.md) | Full feature requirements (Dashboard, Tasks, Habits, Chat, Calendar, Sleep) |
| [docs/spec/data-model.md](docs/spec/data-model.md) | Prisma schema for all models |
| [docs/spec/phases.md](docs/spec/phases.md) | Build phases with task checklists |
| [docs/spec/setup.md](docs/spec/setup.md) | Calendar permissions, Health Connect setup, backend server setup |
| [docs/spec/dev-workflow.md](docs/spec/dev-workflow.md) | Testing setup, review process, deployment steps, phase checklist |
| [docs/spec/enhancements.md](docs/spec/enhancements.md) | Future ideas and brainstorming (background sync, AI task prioritization, etc.) |
| [docs/reviews/](docs/reviews/) | Generated per phase: test results, Sonnet review, Opus review |

## Quick Summary

- **Mobile**: Expo (React Native, Android) + NativeWind
- **Backend**: Node.js + Express + Prisma + SQLite, running locally on PC
- **Calendar**: `expo-calendar` — on-device, no API keys needed
- **Sleep**: Health Connect — on-device, Android only
- **AI**: Claude (Anthropic SDK), proxied through backend

## Current Status

- [x] Plan complete
- [x] Spec reviews complete (Sonnet + Opus, all findings applied)
- [x] Git repo initialised and pushed to https://github.com/pramukhshenoy/cadence
- [x] Node.js installed
- [x] Android Studio installed
- [ ] Android Virtual Device created (Pixel 8, API 35, Google Play) — in progress
- [x] Phase 1 — Foundation ([x] 1a monorepo · [x] 1b server · [x] 1c database · [x] 1d mobile shell)
- [x] Phase 2 — Tasks & Habits ([x] 2a tasks API · [x] 2b habits API · [x] 2c tasks screen · [x] 2d habits + dashboard)
- [x] Phase 3 — AI Chat ([x] 3a chat SSE · [x] 3b models · [x] 3c chat UI · [x] 3d settings)
- [x] Phase 4 — Calendar ([x] 4a permissions · [x] 4b algorithm · [x] 4c sync flow · [x] 4d widget)
- [ ] Phase 5 — Sleep ([x] 5a health connect · [x] 5b backend · [x] 5c reschedule flow · 5d dashboard)
- [ ] Phase 6 — Polish (6a notifications · [x] 6b dark mode · 6c onboarding · 6d error handling)
