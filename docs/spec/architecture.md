# Architecture & Tech Stack

## System Diagram

```
┌──────────────────────────────────────────┐         ┌──────────────────────────┐
│  Android App (Expo + React Native)        │  REST   │  Backend Server           │
│                                           │◄───────►│  (Node.js + Express)      │
│  expo-calendar ───────────────────────────┼────────►│  Scheduling algorithm     │
│  (read events, write blocks)              │◄────────┼─ returns focus blocks     │
│                                           │         │                           │
│  react-native-health-connect (on-device)  │  SSE    │  ┌─────────┐             │
│  └── reads sleep from Health Connect ─────┼────────►│  │ SQLite  │             │
│      (local, no cloud needed)             │ sleep   │  │ Prisma  │             │
│                                           │ summary │  └─────────┘             │
└──────────────────────────────────────────┘         │       │                   │
                                                      └───────┼───────────────────┘
                                                              │
                                                              ▼
                                                         Claude API
```

All app↔backend requests include an `X-Timezone` header (device IANA timezone) and a `Bearer` token for authentication.

## Tech Stack

| Layer         | Choice                                                        |
|---------------|---------------------------------------------------------------|
| Mobile        | Expo (React Native) + TypeScript                              |
| Styling       | NativeWind (Tailwind for React Native)                        |
| Navigation    | Expo Router                                                   |
| Backend       | Node.js + Express + TypeScript                                |
| Database      | Prisma + SQLite                                               |
| Calendar      | expo-calendar (on-device, no API keys needed)                 |
| Health        | react-native-health-connect (on-device, Android only)         |
| AI            | Anthropic SDK (Claude) — OpenAI as fallback if key configured |
| Chat streaming | SSE (Server-Sent Events) — custom hook on client             |
| Auth          | Shared bearer token (stored in Expo SecureStore)              |
| Secure tokens | Expo SecureStore (on device)                                  |
| Data fetching | TanStack Query (React Query) — except chat streaming          |
| Dev builds    | EAS dev-client (required for native modules in Phases 4–5)   |

## Repository Structure

```
ai-assistant/
├── app/        # Expo React Native (Android)
│   └── tsconfig.json  # RN-specific TypeScript config
├── server/     # Node.js + Express backend
│   └── tsconfig.json  # Node-specific TypeScript config
├── docs/
│   ├── spec/   # Planning and specification files
│   └── reviews/ # Review and test output (generated per phase)
└── PLAN.md     # Index
```

## Deployment

- **Backend**: Runs locally on Windows PC during development
- **Mobile**: EAS development build for Phases 4–5 (native modules); Expo Go sufficient for Phases 1–3 (except streaming — verify expo-go SSE support)
- **Production APK**: EAS Build → sideload (no Play Store required for personal use)
- **Future**: Backend can be migrated to Railway or a DigitalOcean droplet

## Environment Variables (Server)

```
PORT=3000
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=
OPENAI_API_KEY=          # optional — OpenAI model option hidden in app if absent
API_BEARER_TOKEN=        # shared secret between app and backend
```
