# Phase 9 — Deduplication Engine

## Goal
Merge the same job posting seen from multiple sources into one canonical record.

## Depends On
- Phase 8: Normalizer

## Scope

### In Scope
- Primary dedupe key: `(companyId, externalId)` — enforced at the DB level already (Phase 3)
- Fallback fuzzy match (title + company + location) for cases with no matching external ID, for future non-platform sources
- "Don't show duplicates" behavior on write: an existing match updates `last_seen_at` rather than inserting a new row

### Out of Scope
- Cross-company deduplication (a job at two different companies is never a duplicate)
- UI for manually merging/splitting duplicates

## Implementation Notes
- See `architecture-context.md` invariant #4: dedupe must run before jobs are written as new records
- At MVP scale (platform connectors only), the DB unique constraint on `(company_id, external_id)` handles almost everything — the fuzzy fallback exists for future sources like LinkedIn reposts, if ever added

## Acceptance Criteria
- [x] Re-running a sync for a company with no actual changes does not create duplicate rows
- [x] A posting seen twice in the same sync (edge case) is written once
- [x] `last_seen_at` updates correctly on every sync that still finds an existing posting
