# Phase 11 — Change Detection

## Goal
Diff each sync's normalized results against the current `jobs` table state to produce new/removed/updated jobs.

## Depends On
- Phase 9: Deduplication Engine
- Phase 10: Scheduler

## Scope

### In Scope
- `JobDiff` computation per company per sync run (`aperture-spec.md` §9)
- New jobs → feed AI matching queue (Phase 17) and notification pipeline (Phase 18)
- Removed jobs → `is_active = false` (never hard delete)
- Updated jobs → detect meaningful field changes (title, salary, location) vs. just a `last_seen_at` bump

### Out of Scope
- The actual notification dispatch (Phase 18) or AI matching (Phase 17) — this phase only produces the diff and hands it off

## Implementation Notes
- Diff against the current `jobs` table state directly — no separate snapshot cache that can drift (`architecture-context.md` invariant #10 equivalent guidance)
- Write to `sync_history` incrementally, not just at the end of a run, so a crashed sync is still observable

## Acceptance Criteria
- [ ] A sync with no real change on the source page produces an empty diff (no new/removed/updated)
- [ ] A posting that disappears from the source is flipped to `is_active = false`, not deleted
- [ ] A `sync_history` row is created for every run with accurate `jobs_found` / `jobs_new` / `jobs_removed` counts
- [ ] A crashed sync mid-run leaves a `sync_history` row with `status = 'failed'` and an `error_message`, not a silently missing record
