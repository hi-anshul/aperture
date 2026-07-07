# Phase 21 — AI Summary

## Goal
Convert long job descriptions into a structured summary: Role, Requirements, Responsibilities, Salary, Benefits, Apply Link.

## Depends On
- Phase 17: AI Matching (shares `packages/ai` infra and queue pattern)

## Scope

### In Scope
- Queued worker job generating the structured summary for each new posting (can run alongside AI Matching, same trigger)
- Summary card rendered at the top of the job detail panel per `ui-context.md`

### Out of Scope
- Re-summarizing on every view — generate once per posting and cache the result
- Editing/regenerating summaries manually (not needed for MVP)

## Implementation Notes
- Separate prompt from match scoring, but can share the same worker queue and `packages/ai` module structure
- Validate the structured output before persisting, same as `MatchResult` (`code-standards.md` AI Matching)

## Acceptance Criteria
- [ ] Every new posting gets a structured summary without manual triggering
- [ ] Summary card renders all five sections (Role, Requirements, Responsibilities, Salary, Benefits) plus the Apply Link
- [ ] Missing source data (e.g., no salary listed) renders gracefully, not as an error or empty section
