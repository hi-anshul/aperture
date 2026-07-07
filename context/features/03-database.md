# Phase 3 — Database

## Goal
Stand up the full Postgres schema via Prisma: `users`, `companies`, `jobs`, `job_sources`, `watchlists`, `saved_jobs`, `resumes`, `notifications`, `sync_history`.

## Depends On
- Phase 1: Project Setup (`packages/db` scaffolded with Prisma)

## Scope

### In Scope
- Full `schema.prisma` per `aperture-spec.md` §3
- Initial migration
- Indexes on `jobs.company_id`, `jobs.is_active`, `jobs.posted_at`, `job_sources.company_id`
- Prisma client singleton export from `packages/db`

### Out of Scope
- Search indexing (Phase 12)
- Seed data / fixtures beyond what's needed for local dev

## Implementation Notes
- `companies.careers_url` is unique — adding the same company twice should fail cleanly, not silently duplicate
- `jobs` has a unique constraint on `(company_id, external_id)` — this is the primary dedupe key (Phase 9 builds on top of this)
- Removed postings are soft-deleted (`is_active = false`), never hard-deleted — see `architecture-context.md` invariant #5

## Acceptance Criteria
- [ ] `pnpm db:migrate` runs cleanly against a fresh Postgres instance
- [ ] All 9 tables exist with the fields defined in `aperture-spec.md` §3
- [ ] Unique constraints on `companies.careers_url` and `jobs (company_id, external_id)` are enforced
- [ ] `pnpm db:studio` opens and shows the schema correctly
- [ ] `packages/db` exports a working Prisma client usable from both `apps/api` and `apps/worker`
