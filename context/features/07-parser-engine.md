# Phase 7 — Parser Engine

## Goal
Convert raw fetched content (HTML/JSON) into `RawJob[]`. One parser per platform.

## Depends On
- Phase 6: Fetch Engine

## Scope

### In Scope
- Parser for each connector implemented so far (start with Greenhouse's JSON response shape)
- Parsers are pure functions: content in, `RawJob[]` out

### Out of Scope
- Any network calls (a parser never fetches — that's the Fetch Engine's job)
- Normalization into the canonical `NormalizedJob` shape (Phase 8)

## Implementation Notes
- Lives in `apps/worker/src/parser-engine`, one file/module per platform
- Keep parsers pure and side-effect-free — this makes them trivial to unit test with fixture data
- A parser should be forgiving of missing/optional fields in the source data but must still produce a valid `RawJob` shape

## Acceptance Criteria
- [x] Greenhouse parser converts a real API response into valid `RawJob[]`
- [x] Parser has no network calls — fully testable with a static fixture file
- [x] Malformed or unexpected input produces a clear error rather than a silent empty result
