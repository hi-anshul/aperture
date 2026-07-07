# Phase 4 — Connector SDK ⭐

## Goal
Define the `Connector` interface and registry that every platform integration implements. This is the heart of the system — get this right before writing any actual connector.

## Depends On
- Phase 3: Database (`Company` type available)

## Scope

### In Scope
- `Connector` interface: `platform`, `canHandle()`, `fetch()` (see `aperture-spec.md` §6)
- `ConnectorRegistry` for lookup by careers URL
- `RawJob` shared type in `packages/shared`
- One real connector implemented against this interface: **Greenhouse** (per Sprint 3 in the build order)

### Out of Scope
- Lever, Ashby, Workday, static-HTML, and Playwright connectors (Phases/Sprints 4–5)
- Parsing logic beyond what Greenhouse's connector needs to return `RawJob[]`

## Implementation Notes
- Rule: connectors never call or depend on each other (`architecture-context.md` invariant #1)
- A connector's `fetch()` returns raw, unparsed-into-canonical-shape data — normalization is Phase 8, not here
- Greenhouse connector should hit the public job board API (`boards-api.greenhouse.io/v1/boards/{token}/jobs`) rather than scraping HTML, since it's stable JSON

## Acceptance Criteria
- [ ] `Connector` interface matches `aperture-spec.md` §6 exactly
- [ ] `ConnectorRegistry.resolve()` correctly picks the Greenhouse connector for a Greenhouse careers URL
- [ ] Greenhouse connector returns valid `RawJob[]` for a real company's board (test against a live public board)
- [ ] Connector is independently unit-testable with fixture data, no live network call required for tests
