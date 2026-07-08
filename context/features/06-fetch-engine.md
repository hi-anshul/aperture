# Phase 6 — Fetch Engine

## Goal
Handle downloading pages only — HTTP and browser automation, retries, timeouts, rate limiting. No parsing.

## Depends On
- Phase 1: Project Setup (Redis/BullMQ available)

## Scope

### In Scope
- Plain HTTP fetcher with retry + exponential backoff + timeout
- Playwright-based browser fetcher for JS-heavy pages
- Per-company rate limiting (respect reasonable request intervals)
- User-Agent handling — only rotate if a specific site's policy requires it; default to a clear, honest UA

### Out of Scope
- Any HTML/JSON parsing (Phase 7)
- Connector-specific logic (connectors call the Fetch Engine, not the other way around)

## Implementation Notes
- Lives in `apps/worker/src/fetch-engine`, see `architecture-context.md` system boundaries
- This module is shared by every connector — connectors should not implement their own HTTP/retry logic (`code-standards.md`)
- Failures here should produce structured errors that `sync_history.error_message` can record

## Acceptance Criteria
- [x] A failed fetch retries with backoff before giving up, and the final failure is surfaced as a structured error
- [x] Fetching a JS-rendered page via the Playwright path returns fully-rendered HTML
- [x] Two rapid fetches against the same company respect the configured rate limit
- [ ] No parsing logic exists anywhere in this module
