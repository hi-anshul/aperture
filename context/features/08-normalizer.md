# Phase 8 — Normalizer

## Goal
Map every platform's raw job fields into the single canonical `NormalizedJob` shape.

## Depends On
- Phase 7: Parser Engine

## Scope

### In Scope
- Normalizer function(s) mapping Greenhouse `RawJob` → `NormalizedJob`
- Field-level mapping: title, description, location → workMode/country, employment type, salary parsing, tags
- Handling missing/inconsistent fields gracefully (null rather than throwing)

### Out of Scope
- Deduplication across sources (Phase 9)
- Additional platform mappings beyond what's connected so far

## Implementation Notes
- This is the **only** place platform-specific field names get translated into canonical ones (`architecture-context.md` invariant #3) — no downstream code should read raw platform fields directly
- `NormalizedJob` schema is defined in `aperture-spec.md` §6 / `packages/shared`
- Salary and location parsing will be messy — prefer conservative null over a wrong guess

## Acceptance Criteria
- [x] Every field in `NormalizedJob` is populated or explicitly null for a real Greenhouse posting
- [x] Normalizer is pure and independently unit-tested against fixture `RawJob` data
- [x] No code outside the normalizer reads a platform-specific raw field name
