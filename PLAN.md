# Personal AI Assistant — Project Plan

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
- [ ] Phase 1 — Foundation (1a monorepo · 1b server · 1c database · 1d mobile shell)
- [ ] Phase 2 — Tasks & Habits (2a tasks API · 2b habits API · 2c tasks screen · 2d habits + dashboard)
- [ ] Phase 3 — AI Chat (3a chat SSE · 3b models · 3c chat UI · 3d settings)
- [ ] Phase 4 — Calendar (4a permissions · 4b algorithm · 4c sync flow · 4d widget)
- [ ] Phase 5 — Sleep (5a health connect · 5b backend · 5c reschedule flow · 5d dashboard)
- [ ] Phase 6 — Polish (6a notifications · 6b dark mode · 6c onboarding · 6d error handling)
