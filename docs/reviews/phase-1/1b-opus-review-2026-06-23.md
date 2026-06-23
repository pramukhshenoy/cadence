# Phase 1b — Opus Review (2026-06-23)

## Findings

### Critical (applied)

**1. index.ts:3-5 / auth.ts — Module-level throw races dotenv.config()**
TypeScript compiles `import` to `require()` calls that execute before any other code. The original module-level throw in `auth.ts` ran before `dotenv.config()` in `index.ts`, meaning `API_BEARER_TOKEN` would always be undefined at module load time, crashing the server at startup regardless of .env contents. Also breaks Jest test imports.
Fix: Removed module-level env var access from `auth.ts`. Startup validation moved to `index.ts` after `dotenv.config()`.

### High (noted, low-severity for this app)

**2. auth.ts:18 — Length check before timingSafeEqual leaks token length**
The `provided.length !== tokenBuf.length` early exit creates a timing oracle: an attacker can enumerate exact token length in O(N) requests. For this single-user local app this is acceptable risk; noted for awareness.

### Low (not applied — out of scope or CLAUDE.md says don't over-engineer)

**3. timezone.ts — IANA validator accepts deprecated aliases**
Engine-dependent. Acceptable for this app since the mobile client sends standard IANA zones.

**4. errorHandler.ts — statusCode not bounds-checked**
No current code sets statusCode from untrusted input. Would be over-engineering to guard.

**5. auth.ts — Empty Bearer token edge case**
If token env var and request token are both empty (prevented by startup check), timingSafeEqual matches. Startup check already prevents this.
