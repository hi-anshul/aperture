# Phase 18 — Notifications

## Goal
Notify the user about new postings from watchlisted companies or high-match jobs, via email, push, or Telegram.

## Depends On
- Phase 11: Change Detection
- Phase 15: Company Watchlist
- Phase 17: AI Matching

## Scope

### In Scope
- `notifications` table writes for: new posting at a watchlisted company, high-match job (above a configurable threshold)
- At least one working delivery channel for MVP (Telegram is the simplest to stand up — bot token + chat ID, no domain/email infra needed)
- Settings page toggle for channel selection and match-score threshold

### Out of Scope
- Push notifications (browser/mobile) — defer unless email/Telegram prove insufficient
- Digest/batched notifications (send as-generated for MVP; batching is a later refinement)

## Implementation Notes
- Notification triggers come out of Change Detection + AI Matching, not a separate polling pass
- Secrets (Telegram bot token, etc.) are server-only, never exposed to the client (`architecture-context.md` Auth and Access Model)

## Acceptance Criteria
- [ ] A new posting from a watchlisted company triggers a notification within one sync cycle
- [ ] A job scoring above the configured match threshold triggers a notification regardless of watchlist status
- [ ] Notification channel and threshold are configurable from Settings
- [ ] `notifications.sent_at` is correctly set once delivery succeeds, left null on failure for retry/debugging
