# Phase 10 — Scheduler

## Goal
Run the fetch pipeline for every tracked company on a fixed interval. No UI involvement.

## Depends On
- Phase 4: Connector SDK
- Phase 6: Fetch Engine

## Scope

### In Scope
- Recurring job (default: every 4 hours) enumerating all companies
- Enqueue one BullMQ job per company (`sync-company`)
- Worker process that resolves the connector via the Platform Detector, runs fetch → parse → normalize → dedupe, and writes results

### Out of Scope
- Change detection (Phase 11) — scheduler triggers the pipeline, change detection is a separate stage within it
- Any HTTP/UI surface — this is a pure background loop (`architecture-context.md` invariant #6)

## Implementation Notes
- See `aperture-spec.md` §9 for the scheduler loop shape
- Respect per-company rate limits already enforced by the Fetch Engine — the scheduler shouldn't add its own conflicting throttling
- Manual "sync now" trigger (used later by the dashboard) should enqueue the same job type, not a separate code path

## Acceptance Criteria
- [ ] Scheduler enqueues exactly one sync job per tracked company per interval
- [ ] A company added mid-cycle gets picked up on the next scheduled run without a restart
- [ ] Scheduler has zero HTTP routes and no UI dependency
- [ ] Failed company syncs don't block other companies' syncs in the same cycle
