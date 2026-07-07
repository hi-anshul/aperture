# Phase 15 — Company Watchlist

## Goal
Let the user star specific companies for priority tracking and notifications.

## Depends On
- Phase 13: Dashboard (Companies page exists)

## Scope

### In Scope
- `POST /api/watchlists` / `DELETE /api/watchlists/:id`
- Watchlist page listing starred companies
- Per-company notification toggle (used by Phase 18)
- "Add company" flow: paste a careers URL → triggers Platform Detector (Phase 5) → company added to tracking list

### Out of Scope
- The actual notification dispatch logic (Phase 18)
- Bulk import of companies (add one at a time for MVP)

## Implementation Notes
- Watchlisted companies don't get a different sync frequency in MVP — they get priority in the *notification* pipeline, not the scheduler itself, per `aperture-spec.md` §11.4
- Adding a company with a URL that fails platform detection should still succeed, just marked `platform: unknown` with a manual override available in Settings

## Acceptance Criteria
- [ ] Adding a company by URL correctly triggers platform detection and appears in the Companies list
- [ ] Starring/unstarring a company updates the watchlist immediately
- [ ] A watchlisted company's new postings are visually distinguished in the Jobs list
- [ ] Removing a company from the watchlist does not delete its historical job data
