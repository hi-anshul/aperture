# Phase 16 — Resume Upload

## Goal
Upload a resume PDF and extract skills, experience, education, and keywords.

## Depends On
- Phase 2: Authentication
- Phase 3: Database

## Scope

### In Scope
- Resume upload UI (`/resume`) accepting a single PDF
- Extraction pipeline (can use Claude directly for extraction, or a dedicated parsing library — decide and record in `progress-tracker.md` Architecture Decisions)
- Store extracted `skills`, `experience`, `education`, `keywords` on the `resumes` table
- One active resume at a time for MVP — a new upload replaces the active one

### Out of Scope
- Multiple resume versions/profiles
- Resume editing UI (re-upload to change)
- OAuth-based cloud storage integrations

## Implementation Notes
- Resume file storage: local volume for self-hosted MVP (see open question in `progress-tracker.md`)
- Extraction should show the user what was parsed for review — don't silently trust it, since it directly feeds AI matching (Phase 17)

## Acceptance Criteria
- [x] Uploading a PDF resume produces a non-empty, reasonable set of extracted skills and keywords
- [x] The extracted data is shown to the user for review after upload
- [x] Re-uploading replaces the previous resume as the active one
- [x] Resume data is scoped to the owning user only
