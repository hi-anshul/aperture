# Phase 19 — Saved Jobs

## Goal
Let the user track jobs through three simple states: Interested, Applied, Rejected.

## Depends On
- Phase 13: Dashboard

## Scope

### In Scope
- `POST /api/saved-jobs`, `PATCH /api/saved-jobs/:id`
- Saved page as a three-column kanban (Interested / Applied / Rejected) per `ui-context.md`
- Drag-and-drop status changes, optimistic UI update via Zustand, persisted through the API

### Out of Scope
- Additional statuses beyond the three defined — "nothing more" per the original spec intent
- Notes/comments per saved job

## Implementation Notes
- Optimistic updates in Zustand should reconcile with the API response, not just assume success (`code-standards.md` State Management)
- Save action available directly from both the job list and the job detail panel

## Acceptance Criteria
- [x] Saving a job from the list or detail panel adds it to "Interested" by default
- [x] Dragging a card between kanban columns updates its status and persists correctly on refresh
- [x] A job can only be saved once per user (no duplicate saved-job rows)
