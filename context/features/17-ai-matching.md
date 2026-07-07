# Phase 17 — AI Matching

## Goal
Score every new job posting against the user's active resume using Claude, with an explanation and missing-skills list.

## Depends On
- Phase 11: Change Detection (produces `newJobs`)
- Phase 16: Resume Upload

## Scope

### In Scope
- Queued worker job (`apps/worker/src/ai-jobs`) triggered for every new posting from Change Detection
- Claude prompt + schema per `aperture-spec.md` §10, output validated against `MatchResult`
- On-demand re-score triggered manually from the dashboard
- Match score + verdict + missing skills + explanation persisted and shown in the job detail panel

### Out of Scope
- Job summarization (Phase 21) — separate AI task, can share `packages/ai` infra but is a distinct prompt
- Batch re-scoring of all historical jobs on resume change (nice-to-have, not MVP-required — note as a possible future enhancement if skipped)

## Implementation Notes
- Runs as a queued worker job, never synchronously inside an API request (`architecture-context.md` invariant #7)
- Never trust raw LLM output directly — parse and validate against the `MatchResult` schema before persisting (`code-standards.md` AI Matching)
- Prompt lives in `packages/ai`, versioned and not inlined in the worker task file

## Acceptance Criteria
- [ ] Every new posting from a sync gets a match score without manual triggering
- [ ] Match score, verdict, missing skills, and explanation are all persisted and visible in the job detail panel
- [ ] Malformed/invalid AI output is caught and does not corrupt stored data
- [ ] Manual re-score from the dashboard works for a single job on demand
