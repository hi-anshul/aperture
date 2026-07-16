# Phase 20 — Analytics

## Goal
Show summary metrics: jobs found, applied, ignored, companies hiring, average match score.

## Depends On
- Phase 17: AI Matching
- Phase 19: Saved Jobs

## Scope

### In Scope
- `GET /api/analytics` aggregating the metrics above
- Dashboard summary cards wired to real data (stub existed from Phase 13)
- Reasonable time window (e.g., last 7/30 days) with a way to change it

### Out of Scope
- Charting/trend graphs over time (flat numbers are enough for MVP)
- Per-company analytics breakdown (aggregate only for MVP)

## Implementation Notes
- Aggregate queries should be efficient at the indexes already defined in Phase 3 — verify query plans if the job count grows large
- "Ignored" = jobs seen but never saved; define this precisely and document it in `aperture-spec.md` if the definition isn't obvious from the schema alone

## Acceptance Criteria
- [x] Dashboard summary cards show real, correct counts
- [x] Average match score is computed only over scored jobs, not all jobs
- [x] Changing the time window updates all metrics consistently
