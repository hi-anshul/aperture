# Phase 12 — Search

## Goal
Let the user search jobs by title, location, company, and tags.

## Depends On
- Phase 3: Database (jobs table populated)

## Scope

### In Scope
- PostgreSQL full-text search (`to_tsvector`/`to_tsquery` or `ILIKE` for MVP simplicity) across title, location, company name, tags
- Search endpoint on `GET /api/jobs` as a query param, combinable with filters (Phase 14)

### Out of Scope
- Meilisearch or any external search infra — explicitly deferred, see `aperture-spec.md` §15 Out of Scope
- Typo-tolerant/fuzzy search beyond what Postgres trigram support gives you for free, if added

## Implementation Notes
- Keep the search implementation swappable — if Meilisearch is added later, it should replace this query layer without changing the API contract
- Add a GIN index on the searchable columns if using `to_tsvector`, or `pg_trgm` if using `ILIKE` fuzzy matching, once query performance actually needs it

## Acceptance Criteria
- [x] Searching a company name returns jobs from that company
- [x] Searching a partial job title returns relevant matches
- [x] Search combines correctly with active filters (Phase 14) rather than replacing them
- [x] Search response time stays reasonable at expected personal-use data volumes (a few thousand jobs)
