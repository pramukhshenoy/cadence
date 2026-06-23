# Phase 1b — Sonnet Review (2026-06-23)

## Findings

### CONFIRMED

**1. auth.ts:4 — `API_BEARER_TOKEN` read on every request; no startup failure on missing env var**
Every authenticated request executes `process.env.API_BEARER_TOKEN` and the null guard. If the env var is absent the server starts silently and every request returns 500. Fix: read once at module level, throw at startup if missing.

**2. auth.ts:18 — `!==` string comparison susceptible to timing side-channel**
Plain `!==` short-circuits on the first differing character. An attacker with repeated access can binary-search the token. Fix: `crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(token))`.

### PLAUSIBLE

**3. timezone.ts:13 — No IANA timezone validation; arbitrary string accepted**
No current consumer of `req.timezone` in the codebase, but Phases 2–5 all do local-time math. An invalid zone (e.g. `"garbage/zone"`) would cause a `RangeError` in `Intl.DateTimeFormat` at the call site. Fix: validate before accepting.

**4. errorHandler.ts:14 — 4xx `err.message` passed verbatim to client**
No current exploitable path; risk grows as routes are added. Low priority for now.

**5. errorHandler.ts:13 — `statusCode` not bounds-checked**
No current code sets `statusCode` from untrusted input. Low priority.

## Applied Fixes
- Finding 1: cache token at module level, throw at startup
- Finding 2: `crypto.timingSafeEqual` for token comparison
- Finding 3: IANA timezone validation (Intl.supportedValuesOf)
