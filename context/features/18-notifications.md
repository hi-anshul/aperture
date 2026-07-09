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
- User prefs live on `users`: `notificationChannel` (`email` | `push` | `telegram`, default `telegram`) and `matchScoreThreshold` (0–100, default `80`). No separate settings table for MVP.
- API: `GET /api/settings` and `PATCH /api/settings` return/update those prefs (session-scoped). Telegram bot token / chat ID stay in env only — never returned to the client.
- Notification `type` values: `dream-company` for a new posting at a watchlisted company with `notificationsEnabled`; `high-match` when `matchScore >= matchScoreThreshold` after AI matching (regardless of watchlist).
- Dispatch is a BullMQ `notify` queue job (create `notifications` row with `sent_at` null → deliver → set `sent_at` on success). Failed delivery leaves `sent_at` null for retry/debugging.
- MVP delivery channel: Telegram (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`). Selecting `email` / `push` in Settings stores the preference but does not deliver until those channels are implemented.

## Acceptance Criteria
- [x] A new posting from a watchlisted company triggers a notification within one sync cycle
- [x] A job scoring above the configured match threshold triggers a notification regardless of watchlist status
- [x] Notification channel and threshold are configurable from Settings
- [x] `notifications.sent_at` is correctly set once delivery succeeds, left null on failure for retry/debugging
