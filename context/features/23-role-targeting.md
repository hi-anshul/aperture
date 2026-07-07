# Phase 23 — Role Targeting

## Goal
Let the user restrict what they see and get notified about to specific roles (e.g. "Product Manager"), instead of every job at a tracked company.

## Depends On
- Phase 3: Database
- Phase 14: Filters
- Phase 18: Notifications

## Scope

### In Scope
- A `target_roles` field (array of title keywords, e.g. `["product manager", "senior pm", "product lead"]`) — global, on the `users` table for MVP
- `GET /api/jobs` defaults to filtering by `target_roles` when set; explicit "show all roles" toggle to bypass it
- Notification pipeline (Phase 18) only fires for postings whose title matches `target_roles` — this is a filter applied on top of the existing watchlist/match-score triggers, not a replacement for them
- Settings UI to add/edit/remove target role keywords
- Matching is simple case-insensitive substring/keyword matching on `jobs.title` for MVP — not a separate AI classification step

### Out of Scope
- Per-company target roles (global list only for MVP — e.g. you can't want "PM" at Google but "Engineer" at Anthropic)
- AI-based role classification (e.g. inferring that "Growth Lead" counts as PM-adjacent) — keyword matching only, revisit if it proves too strict/loose in practice
- Excluding roles by keyword (only inclusion lists for MVP, no "never show me X")

### Non-Goals / Explicit Behavior
- Non-matching jobs are **never deleted or hidden from the database** — they're simply filtered out of the default view and notification pipeline. The user can always toggle "show all roles" to see everything that was found.
- If `target_roles` is empty, behavior is unchanged from today — all jobs show, all notification rules apply as before.

## Implementation Notes
- Store `target_roles` as `text[]` on `users`, matching the pattern already used for `jobs.tags` and `resumes.skills`
- Reuse the same filter-combination logic from Phase 14 (`architecture-context.md` invariant on Zustand/filter state) — role targeting is just another filter, defaulted on rather than off
- In the notification pipeline (Phase 18), add the role-match check as an additional condition alongside "is watchlisted" / "is high match" — a posting still needs to satisfy at least one of those triggers, it just also now needs to pass the role filter if one is set
- Keep the matching function (`matchesTargetRoles(title, targetRoles)`) in `packages/shared` so both `apps/api` (filtering) and `apps/worker` (notifications) use the identical logic — don't duplicate it

## Acceptance Criteria
- [ ] Setting `target_roles` to `["product manager"]` narrows the default jobs list to matching titles only
- [ ] A "show all roles" toggle reveals the full unfiltered list without losing the saved target roles
- [ ] A new posting that doesn't match `target_roles` does not trigger a notification, even if it's from a watchlisted company or scores a high match
- [ ] A new posting that does match `target_roles` still requires an existing trigger (watchlist or high match) to fire a notification — role targeting narrows, it doesn't add a new trigger on its own
- [ ] Non-matching jobs remain in the database and viewable via "show all roles," never deleted
- [ ] Leaving `target_roles` empty preserves current (Phase 14/18) behavior exactly
