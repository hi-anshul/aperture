# Phase 14 — Filters

## Goal
Let the user narrow the jobs list by remote/hybrid/onsite, country, experience, salary, platform, visa sponsorship, and employment type.

## Depends On
- Phase 13: Dashboard (Jobs list rendering real data)

## Scope

### In Scope
- Filter sidebar UI per `ui-context.md` layout patterns
- Filter state managed in Zustand, not prop-drilled (`code-standards.md` State Management)
- `GET /api/jobs` accepts each filter as a query param; filters combine with AND semantics
- Active filter count badge on each filter control

### Out of Scope
- Saved filter presets (not in MVP scope)
- Search (Phase 12) — filters and search must compose, but search itself is built separately

## Implementation Notes
- Debounce filter changes before re-querying the API (`code-standards.md` Performance)
- Filtering happens server-side against Postgres, not client-side against an already-fetched page of jobs

## Acceptance Criteria
- [ ] Each filter independently narrows the job list correctly
- [ ] Multiple simultaneous filters combine with AND semantics
- [ ] Filter state persists across a page refresh within the same session (or is intentionally reset — decide and document in `progress-tracker.md`)
- [ ] Active filters show a count badge and can be cleared individually or all at once
