# Phase 5 — Platform Detector

## Goal
Given a careers URL, determine which connector should handle it.

## Depends On
- Phase 4: Connector SDK

## Scope

### In Scope
- Fast-path URL pattern matching (`*.greenhouse.io`, `jobs.lever.co/*`, `jobs.ashbyhq.com/*`, `*.myworkdayjobs.com/*`)
- Fallback detection: fetch once, inspect for known platform signatures, static HTML, or JS-only rendering
- Persist detected platform on `companies.platform`
- Manual override path (used later by Settings UI in Phase 13)

### Out of Scope
- The connectors themselves (already covered in Phases 4/6)
- UI for manual override (build the data layer now, wire up the Settings page in Phase 13)

## Implementation Notes
- See detection algorithm in `aperture-spec.md` §7
- Detection runs once per company and is cached — don't re-detect on every sync cycle
- `unknown` is a valid, expected outcome — don't force a guess

## Acceptance Criteria
- [ ] Known platform URLs (Greenhouse, Lever, Ashby, Workday patterns) resolve without a network call
- [ ] Unrecognized URLs fall back to a single fetch + content inspection
- [ ] Detected platform is persisted to `companies.platform`
- [ ] A company that can't be confidently classified is marked `unknown` rather than defaulting incorrectly
