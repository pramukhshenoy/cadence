# Phase 3a — Opus Review (2026-06-23)

## Findings Applied

### Bug 1 — Race: AbortController registered after DB queries; disconnect during await is missed (CONFIRMED)
`req.on('close', ...)` was registered after the `await Promise.all([...])` for history/systemPrompt/settings.
If the client disconnected during those ~50-200ms of DB work, the 'close' event fired before the
listener existed and was never replayed — the Anthropic stream ran to full completion billing tokens.
**Fix:** Moved `AbortController` + `req.on('close', ...)` registration to immediately before the
`await Promise.all`, so disconnect events during DB queries are captured. The already-aborted signal
is then passed to `messages.create({ signal })` which stops the stream immediately.

### Bug 2 — Sequential persistence creates orphaned USER row if ASSISTANT save fails (CONFIRMED)
Two sequential `await prisma.chatMessage.create(...)` calls with no transaction: if USER write
succeeded and ASSISTANT write threw, `catch(dbErr)` swallowed the error leaving an orphaned USER
row. On the next request the `firstUserIdx` guard only trims leading ASSISTANT entries — a trailing
orphaned USER would pass through, causing two consecutive `user` roles in `sdkMessages` → Anthropic
400 → conversation permanently broken.
**Fix:** Replaced the two sequential creates with `await prisma.$transaction([create1, create2])`.
If either write fails, neither is committed.

### Bug 3 — AbortError name check always passes; every disconnect floods server logs (CONFIRMED)
`(streamErr as { name?: string }).name !== 'AbortError'` checked for the native fetch abort error
name. But the Anthropic SDK throws `APIUserAbortError` (not `AbortError`) when the signal fires
before the stream starts. `APIUserAbortError.name` evaluates to `'APIUserAbortError'`, making the
condition always `true` and logging `console.error` on every normal client disconnect.
**Fix:** Changed to `!abortController.signal.aborted` — checks the actual signal state rather than
an error class name string, correctly suppressing logging for all intentional aborts.

## Deferred Findings (not in scope for phase 3a)

- **No idempotency on retry**: Client retry after network timeout saves duplicate USER+ASST pairs.
  Would require a `messageId` field + unique index on `ChatMessage`. Deferred to phase 6 polish.
- **OpenAI model guard**: `claude-` prefix validation will need updating in phase 3b when OpenAI
  support is added. Noted for phase 3b implementation.
- `todayLocalDate` duplication: Noted; extraction to `server/src/lib/dateUtils.ts` deferred as
  a cleanup task (not a runtime bug).

## Tests After Fixes
91 tests passing (3 suites). 14 chat-specific tests. `tsc --noEmit` and `eslint` clean.
