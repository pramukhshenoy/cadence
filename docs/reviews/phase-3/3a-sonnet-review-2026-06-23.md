# Phase 3a — Sonnet Review (2026-06-23)

## Findings Applied

### Bug 1 — DB error after SSE flush causes `next(err)` on committed response (CONFIRMED)
`errorHandler` called `res.status(500).json()` unconditionally after SSE headers already flushed.
**Fix:** Moved `prisma.chatMessage.create` for ASSISTANT into a separate inner try-catch that
logs the error but does not call `next(err)`. DB failures no longer reach the Express error handler
after headers are committed.

### Bug 2 — History truncation at take:20 boundary makes `sdkMessages[0]` role:'assistant' (CONFIRMED)
Saving the user message first then `take:20` could drop the oldest USER message, leaving ASST first.
Anthropic API requires first message to be `user`.
**Fix:** Changed to `take: 19` prior messages fetched before saving anything; current user message
appended manually as the 20th. Added guard to drop any leading ASSISTANT entries after truncation.

### Bug 3 — Streaming failure orphans USER message → conversation permanently broken (CONFIRMED)
`prisma.chatMessage.create` for USER ran before streaming; if stream failed, orphaned USER row
caused consecutive USER roles on next turn → Anthropic 400 → permanent conversation breakage.
**Fix:** Both USER and ASSISTANT messages are now persisted only after a successful stream,
preventing orphaned rows entirely.

### Bug 4 — Due date formatted as UTC, wrong calendar day for UTC+ users (CONFIRMED)
`t.dueDate.toISOString().slice(0,10)` gives UTC date; for UTC+5:30 user storing a local date,
this shows one day early.
**Fix:** Replaced with `new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(t.dueDate)`,
mirroring the existing `todayLocalDate` pattern. `tz` was already in scope.

### Bug 5 — Client disconnect doesn't abort Anthropic stream; burns tokens (CONFIRMED)
No `AbortController` or disconnect handler; stream ran to completion after client disconnected.
**Fix:** Added `AbortController`; wired to `req.on('close', ...)`. Signal passed to
`anthropic.messages.create({ ... }, { signal })`. AbortError is silently ignored in the catch.

### Bug 6 — Model override accepts any string; non-Claude model causes orphaned USER row (CONFIRMED)
Any string passed as `model` was forwarded to Anthropic SDK without validation.
**Fix:** Added validation that model override must start with `'claude-'`; returns 400 otherwise.
Aligns with CLAUDE.md: "Anthropic Claude is always the default."

### Bug 7 — Inner streaming catch swallowed error silently (CONFIRMED)
`catch { }` with no variable and no logging made Anthropic errors invisible server-side.
**Fix:** Added `console.error('Chat stream error:', streamErr)` with AbortError suppression.

## Cleanup Applied
- `new Anthropic()` moved to module-level lazy singleton `getAnthropic()`.
- SSE parse boilerplate in tests extracted to `postChat()` and `parseSSE()` helpers.

## Tests After Fixes
91 tests passing (3 suites). 14 chat-specific tests. `tsc --noEmit` and `eslint` clean.
