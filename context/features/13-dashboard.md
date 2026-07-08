# Phase 13 — Dashboard

## Goal
Build the core dashboard pages and shared layout shell.

## Depends On
- Phase 2: Authentication
- Phase 3: Database

## Scope

### In Scope
- Pages: Dashboard, Jobs, Companies, Watchlist, Saved, Resume, Settings (routes per `aperture-spec.md` §11)
- Shared `AppLayout` with top navbar + sidebar navigation
- Dashboard summary cards (jobs found, high matches, companies hiring, avg match) — wired up properly in Phase 20 (Analytics), stub with real counts here where cheap
- Jobs list + detail panel layout per `ui-context.md` §"Job List" / §"Job Detail Panel"

### Out of Scope
- Filtering logic (Phase 14)
- Company watchlist interactions (Phase 15)
- Resume upload flow (Phase 16)
- Full analytics computation (Phase 20)

## Implementation Notes
- Follow layout patterns and dark theme tokens exactly from `ui-context.md` — no hardcoded hex values, use CSS custom properties
- `apps/web` never queries the database directly — every page calls `apps/api` (`architecture-context.md` invariant #15)
- Job detail panel slides in from the right rather than navigating away from the list

## Acceptance Criteria
- [x] All seven routes render within the shared `AppLayout` shell
- [x] Job list displays real data from `GET /api/jobs` with correct row density per `ui-context.md`
- [x] Clicking a job row opens the detail panel without a full navigation
- [x] No raw hex colors or inline styles appear in any dashboard component
