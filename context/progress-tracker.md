# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 0: Product Specification (SDD) — Completed
- Phase 1: Project Setup — Completed
- Phase 2: Authentication — Completed
- Phase 3: Database — Completed
- Phase 4: Connector SDK — Completed
- Phase 5: Platform Detector — Completed
- Phase 6: Fetch Engine — Completed
- Phase 7: Parser Engine — Completed
- Phase 8: Normalizer — Completed
- Phase 9: Deduplication Engine — Completed
- Phase 10: Scheduler — Completed
- Phase 11: Change Detection — Completed
- Phase 12: Search — Completed

## Current Goal

- Phase 14: Filters (`features/14-filters.md`)

## Completed

- **Phase 0: Product Specification (SDD)**
  - Defined product vision, goals, and core user flow in `project-overview.md`.
  - Defined the connector-based architecture, system boundaries, storage model, auth model, and 20 architectural invariants in `architecture-context.md`.
  - Defined the full technical spec — data models, folder structure, connector interface, platform detection logic, fetch/parse/normalize/dedupe pipeline, scheduler, AI matching, API routes, environment variables, and 10-sprint build order — in `aperture-spec.md`.
  - Defined coding standards per layer (TypeScript, Next.js, NestJS, Connector SDK, AI matching, auth, styling, testing) in `code-standards.md`.
  - Defined the dark-mode design system (colors, typography, layout patterns, job list/detail conventions, match-score and status color semantics) in `ui-context.md`.
  - Defined the spec-driven workflow rules (scoping, splitting work, protected files, doc-sync requirements) in `ai-workflow-rules.md`.
  - Produced a Phase 1 setup reference document (`01-project-setup.md`) covering root monorepo config (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.env.example`) and starter code for `packages/shared`, `packages/connectors`, and `packages/db`.
  - Produced feature-by-feature implementation specs for Phases 2–22 in `features/`, each with Goal, Depends On, Scope, Implementation Notes, and Acceptance Criteria.
  - Added Phase 23 (`features/23-role-targeting.md`) — keyword-based role filtering (e.g. "Product Manager") layered on top of the existing filter and notification pipelines.
  - Project named **Aperture**; all context files and package names updated accordingly.
  - Switched database from local Docker Postgres to **Neon** (managed, cloud-hosted) across context files — motivated by wanting the app reachable online for possible future use by friends.
  - Switched Redis from local Docker to **Upstash** (managed); removed `docker-compose.yml`.

- **Phase 1: Project Setup**
  - Initialized pnpm + Turborepo monorepo: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `specs/` directory.
  - Migrated flat Next.js scaffold into `apps/web` (Next.js 16, App Router, Tailwind v4, Geist font, dark-mode default).
  - Scaffolded `apps/api` (NestJS) with module stubs: `auth`, `companies`, `jobs`, `watchlists`, `saved-jobs`, `resumes`, `notifications`, plus `/health` endpoint.
  - Scaffolded `apps/worker` (Node/TS) with BullMQ queue connection and empty scheduler stub.
  - Created `packages/shared` with canonical types (`RawJob`, `NormalizedJob`, `Company`, `JobDiff`, `MatchResult`).
  - Created `packages/connectors` with `Connector` interface and `ConnectorRegistry`.
  - Created `packages/db` with Prisma schema (9 tables), client singleton, and `pnpm db:generate` working.
  - Created empty scaffold packages: `packages/ai`, `packages/ui`.
  - Verified `pnpm build` passes across all 8 workspaces.

- **Phase 2: Authentication**
  - Session-based auth with `iron-session` in `apps/api`: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
  - Global `AuthGuard` on all NestJS routes except `@Public()` login and `/health`; returns 401 for missing/invalid sessions.
  - Shared session config in `packages/shared/src/session.ts` (`SESSION_COOKIE_NAME`, `SessionData`, `getSessionOptions`).
  - Login page at `apps/web/app/(auth)/login/page.tsx` with design-token styling per `ui-context.md`.
  - Next.js middleware protects `/dashboard`, `/jobs`, `/companies`, `/watchlist`, `/saved`, `/resume`, `/settings`; redirects unauthenticated users to `/login`.
  - API requests proxied through Next.js (`/api/*` rewrite) so session cookies stay same-origin.
  - Placeholder pages for all seven protected routes; logout button on `/settings`.
  - User seed script (`pnpm db:seed`) via `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` env vars.
  - `users` table already in Prisma schema; seeded MVP user against Neon.
  - Updated `globals.css` with full dark-mode design tokens from `ui-context.md`.
  - Compiled `@aperture/db` and `@aperture/shared` to `dist/` so the API resolves workspace packages at runtime.
  - Verified acceptance criteria: protected-route redirect, valid login → session + `/dashboard`, generic invalid-credentials error, logout destroys session, API returns 401 without session.

- **Phase 3: Database**
  - Full `schema.prisma` aligned with `aperture-spec.md` §3: all 9 tables (`users`, `companies`, `jobs`, `job_sources`, `watchlists`, `saved_jobs`, `resumes`, `notifications`, `sync_history`).
  - Added query indexes on `jobs.company_id`, `jobs.is_active`, `jobs.posted_at`, and `job_sources.company_id`.
  - Added missing foreign keys: `notifications.user_id → users`, `sync_history.company_id → companies`.
  - Initial migration (`20260707103004_aperture`) plus follow-up (`20260708053021_add_indexes_and_foreign_keys`) applied cleanly against Neon.
  - Unique constraints enforced: `companies.careers_url`, `jobs (company_id, external_id)`.
  - Prisma client singleton exported from `packages/db/src/index.ts`; consumed by `apps/api` (`auth.service`) and available to `apps/worker`.
  - Verified `prisma migrate status` reports database in sync; `pnpm db:studio` launches Prisma Studio.

- **Phase 4: Connector SDK**
  - `Connector` interface and `ConnectorRegistry` in `packages/connectors/src/connector.ts` match `aperture-spec.md` §6.
  - `RawJob` and `Company` types confirmed in `packages/shared/src/types.ts`.
  - Greenhouse connector (`packages/connectors/src/greenhouse/`): `canHandle()` for `*.greenhouse.io` URLs, `fetch()` via `boards-api.greenhouse.io/v1/boards/{token}/jobs`, maps API JSON to `RawJob[]`.
  - `createDefaultRegistry()` in `packages/connectors/src/registry.ts` registers Greenhouse; `resolve()` picks it for Greenhouse careers URLs.
  - Fixture-based unit tests (14 passing) in `greenhouse.connector.test.ts` — no live network required for CI.
  - Live verification against Stripe's public board returned 496 valid `RawJob` records.
  - `pnpm --filter @aperture/connectors test` and `pnpm --filter @aperture/connectors build` pass.

- **Phase 5: Platform Detector**
  - `packages/connectors/src/platform-detector.ts` — fast-path URL pattern matching for Greenhouse, Lever, Ashby, and Workday; fallback single-fetch + HTML content inspection for platform JS/meta signatures, static HTML job listings, and JS-only SPA shells.
  - `packages/connectors/src/platform-persistence.ts` — `detectAndPersistPlatform()` writes to `companies.platform` with caching (skips re-detection when platform is already known); `overrideCompanyPlatform()` for manual override; `shouldDetectPlatform()` guard.
  - Fixture-based unit tests (23 passing) in `platform-detector.test.ts` — URL patterns, content inspection, fetch fallback, persistence, and manual override; no live network required for CI.
  - `pnpm --filter @aperture/connectors test` and `pnpm --filter @aperture/connectors build` pass.

- **Phase 6: Fetch Engine**
  - `apps/worker/src/fetch-engine/` — download-only module (no parsing): HTTP fetcher, Playwright browser fetcher, per-company rate limiter, structured `FetchError` for `sync_history.error_message`.
  - HTTP path: retry with exponential backoff, configurable timeout, honest default User-Agent (`Aperture/1.0`), optional per-request UA override.
  - Browser path: Playwright `chromium` with `networkidle` wait; returns fully-rendered HTML via `page.content()`.
  - `FetchEngine` orchestrator applies per-company rate limiting before delegating to HTTP or browser mode.
  - Configurable via env vars: `FETCH_TIMEOUT_MS`, `FETCH_MAX_RETRIES`, `FETCH_INITIAL_BACKOFF_MS`, `FETCH_MAX_BACKOFF_MS`, `FETCH_BACKOFF_MULTIPLIER`, `FETCH_RATE_LIMIT_MS`, `FETCH_USER_AGENT`.
  - Fixture-based unit tests (6 passing) in `fetch-engine.test.ts` — retries/backoff, structured errors, browser HTML, rate limiting, no parsing.
  - `pnpm --filter @aperture/worker test` and `pnpm --filter @aperture/worker build` pass.

- **Phase 7: Parser Engine**
  - `apps/worker/src/parser-engine/` — parse-only module (no fetching): Greenhouse JSON parser, platform-routing orchestrator, structured `ParserError` for `sync_history.error_message`.
  - Greenhouse parser is a pure function: raw JSON string in, `RawJob[]` out; forgiving of missing optional fields but requires `id` and `absolute_url` per job.
  - Malformed JSON, missing `jobs` array, or all-invalid job entries throw `ParserError` instead of returning a silent empty result.
  - Fixture-based unit tests (9 passing) in `parser-engine.test.ts` — real API fixture, invalid input errors, no network calls.
  - `pnpm --filter @aperture/worker test` and `pnpm --filter @aperture/worker build` pass.

- **Phase 8: Normalizer**
  - `apps/worker/src/normalizer/` — normalize-only module: Greenhouse `RawJob` → `NormalizedJob`, platform-routing orchestrator.
  - Field mappers for title, description, location → workMode/country, employment type, salary parsing, tags, visa sponsorship, and posted date.
  - Missing or inconsistent Greenhouse fields resolve to null (or empty string for required description) rather than throwing.
  - Platform-specific field names (`content`, `location.name`, `metadata`, etc.) are read only inside `normalizer/greenhouse/`.
  - Fixture-based unit tests (6 passing) in `normalizer.test.ts` — real RawJob fixture data, no network calls.
  - `pnpm --filter @aperture/worker test -- src/normalizer` and `pnpm --filter @aperture/worker build` pass.

- **Phase 9: Deduplication Engine**
  - `apps/worker/src/dedupe-engine/` — dedupe-only module: merges the same posting from multiple sources into one canonical record before write.
  - Primary match on `(companyId, externalId)`; fallback fuzzy match on normalized title + company name + location for future non-platform sources.
  - Existing matches return `action: "update"` with preserved `id`, `externalId`, and `firstSeenAt`; `lastSeenAt` bumps to `syncedAt`. New records return `action: "insert"`.
  - In-batch deduplication collapses duplicate external IDs or fuzzy matches within a single sync run.
  - Fixture-based unit tests (10 passing) in `dedupe-engine.test.ts` plus parse → normalize → dedupe integration test — no network or DB calls.
  - `pnpm --filter @aperture/worker test -- src/dedupe-engine` and `pnpm --filter @aperture/worker build` pass.

- **Phase 10: Scheduler**
  - `apps/worker/src/scheduler/` — recurring poll loop (default every 4 hours via `SCHEDULER_INTERVAL_MS`) enumerates all companies and enqueues one BullMQ `sync-company` job per company; runs once on startup then on each interval.
  - `enqueueCompanySync()` shared by the scheduler and future manual "sync now" triggers — same job type, not a separate code path.
  - `apps/worker/src/sync-company/` — BullMQ worker (concurrency 5) processes each job independently; failures do not block other companies.
  - Per-company pipeline: platform detection → connector resolve → fetch → normalize → dedupe → DB write; records `sync_history` and updates `job_sources`.
  - Worker uses Neon's `DIRECT_URL` for long-lived DB connections (`apps/worker/src/load-env.ts`).
  - No HTTP routes or UI dependency — pure background loop per `architecture-context.md` invariant #6.
  - Fixture-based unit tests (4 passing) in `scheduler.test.ts` and `write-jobs.test.ts`.
  - `pnpm --filter @aperture/worker test -- src/scheduler src/sync-company` and `pnpm --filter @aperture/worker build` pass.

- **Phase 11: Change Detection**
  - `apps/worker/src/change-detection/` — diff-only module: compares deduped sync results against current `jobs` table rows (no separate snapshot cache).
  - `computeJobDiff()` produces `JobDiff` with `newJobs`, `removedJobIds`, and `updatedJobs` (meaningful changes to title, salary, or location — not `last_seen_at`-only bumps).
  - `applyJobChanges()` writes deduped jobs, reactivates reappearing postings, and soft-deletes removed jobs (`is_active = false`, never hard delete).
  - `handoffJobDiff()` stub hands diff to future AI matching (Phase 17) and notification (Phase 18) pipelines.
  - Integrated into `processSyncCompany()` after dedupe; `sync_history` updated incrementally with `jobs_found` / `jobs_new` / `jobs_removed` before final success/failed status.
  - Fixture-based unit tests (10 passing) in `change-detection.test.ts`, `apply-changes.test.ts`, plus dedupe → change detection integration test — no network or DB calls.
  - `pnpm --filter @aperture/worker test -- src/change-detection src/sync-company` and `pnpm --filter @aperture/worker build` pass.

- **Phase 12: Search**
  - `GET /api/jobs` live in `apps/api/src/jobs/` with `q` query param for ILIKE search across title, location, company name, and tags.
  - Swappable `JobSearchProvider` interface (`JOB_SEARCH_PROVIDER` token) — Postgres ILIKE today, Meilisearch can replace without API contract changes.
  - `PostgresIlikeJobSearch` uses Prisma `contains` (case-insensitive) for text fields and a raw SQL `unnest(tags)` lookup for partial tag matches.
  - Filter query params (`workMode`, `country`, `platform`, `visaSponsorship`, `employmentType`, `salaryMin`, `salaryMax`) scaffolded for Phase 14 — search and filters compose with AND semantics, not OR.
  - Fixture-based unit tests (11 passing) in `apps/api/src/jobs/**/*.test.ts` — search constraint building, filter parsing, and search+filter composition.
  - `pnpm --filter @aperture/api test` and `pnpm --filter @aperture/api build` pass.

- **Phase 13: Dashboard**
  - Initialized shadcn/ui in `apps/web` (`components.json`, `components/ui/*`, `lib/utils.ts`); mapped shadcn dark tokens to Aperture design tokens in `globals.css`.
  - Shared `AppLayout` shell with sticky top navbar + sidebar navigation (`components/layout/`), wrapping all seven protected routes via `(app)` route group.
  - Dashboard page: summary cards (jobs found this week, companies hiring from `GET /api/jobs`; high matches and avg match stubbed for Phases 17/20) + recent activity feed.
  - Jobs page: three-column layout (filter sidebar stub, dense job list, right detail panel) wired to `GET /api/jobs`; row click opens slide-in panel via Framer Motion without route navigation; Zustand store for selected job and new-job indicators.
  - Placeholder content pages for Companies, Watchlist, Saved, Resume, Settings — all within `AppLayout`.
  - Server-side API helper (`lib/api/server.ts`) forwards session cookies to NestJS; no direct DB access from web.
  - Added `lucide-react`, `framer-motion`, `zustand` dependencies.
  - `pnpm --filter @aperture/web build` passes.

## In Progress

- None.

## Next Up

- Phase 14: Filters (`features/14-filters.md`)
- Add Upstash `REDIS_URL` (TLS `rediss://` URL) to `.env` before running the worker.

## Open Questions

- Auth approach for MVP: confirmed as session-based single-user (`iron-session`) per `architecture-context.md` — revisit if multi-user becomes a near-term goal.
- Object storage for resume uploads: local volume vs. a managed bucket — not yet decided, defer until Phase 16 (Resume Upload).

## Architecture Decisions

- Defaulting application styling to dark mode only with Geist Sans font, per `ui-context.md`.
- Single-user session auth for MVP, with `user_id` foreign keys present from day one so multi-user support is additive later, not a schema rewrite.
- Connectors communicate only through the shared `Connector` interface — the Fetch Engine, Parser Engine, and Normalizer are separate modules with no cross-calls, per `architecture-context.md` invariants #1–#3.
- Removed job postings are soft-deleted (`is_active = false`), never hard-deleted, to keep `sync_history` and analytics accurate over time.
- LinkedIn/Indeed/Naukri connectors deliberately excluded from MVP scope — platform connectors (Greenhouse/Lever/Ashby/Workday) plus generic/Playwright fallbacks cover direct career sites without fighting aggregator anti-scraping measures.
- Database is Neon (managed Postgres), not self-hosted, using separate pooled (`apps/api`) and direct (`apps/worker`, migrations) connection strings.
- Redis is Upstash (managed), not self-hosted via Docker — worker connects via `REDIS_URL` (`rediss://` TLS URL).
- API traffic from the browser goes through Next.js rewrites (`/api/*`) so `iron-session` cookies remain same-origin; NestJS still enforces auth independently.

## Session Notes

- Executed Phase 1 from `01-project-setup.md`: monorepo scaffold is live. Root-level Next.js files removed; app lives under `apps/web`.
- Executed Phase 2 from `02-authentication.md`: login/logout/session guard live. Default seed user is `admin@example.com` (set `SEED_USER_PASSWORD` in `.env`). shadcn/ui init deferred to Phase 13 dashboard shell — login page uses design-token Tailwind directly.
- Executed Phase 3 from `03-database.md`: indexes and FK gaps closed via `20260708053021_add_indexes_and_foreign_keys` migration. Re-run `pnpm db:generate` after stopping `pnpm dev` if Prisma client DLL is locked on Windows.
- Executed Phase 4 from `04-connector-sdk.md`: Greenhouse connector live; registry resolves `boards.greenhouse.io/*` URLs. Run `pnpm --filter @aperture/connectors test` for fixture-based tests.
- Executed Phase 5 from `05-platform-detector.md`: Platform Detector live in `packages/connectors`. Run `pnpm --filter @aperture/connectors test` for URL-pattern, content-inspection, and persistence tests.
- Executed Phase 6 from `06-fetch-engine.md`: Fetch Engine live in `apps/worker/src/fetch-engine`. Run `pnpm --filter @aperture/worker test` for fixture-based tests. Playwright is a worker dependency — run `pnpm exec playwright install chromium` before using the browser fetch path in production.
- Executed Phase 7 from `07-parser-engine.md`: Parser Engine live in `apps/worker/src/parser-engine`. Run `pnpm --filter @aperture/worker test` for Greenhouse fixture-based parser tests.
- Executed Phase 8 from `08-normalizer.md`: Normalizer live in `apps/worker/src/normalizer`. Run `pnpm --filter @aperture/worker test -- src/normalizer` for Greenhouse RawJob fixture-based normalizer tests.
- Executed Phase 9 from `09-deduplication-engine.md`: Dedupe Engine live in `apps/worker/src/dedupe-engine`. Run `pnpm --filter @aperture/worker test -- src/dedupe-engine` for fixture-based dedupe tests.
- Executed Phase 10 from `10-scheduler.md`: Scheduler + sync-company worker live. Set `REDIS_URL` and `DIRECT_URL` in `.env`, then run `pnpm --filter @aperture/worker dev`. Optional: `SCHEDULER_INTERVAL_MS` (default 14400000 = 4h).
- Executed Phase 11 from `11-change-detection.md`: Change Detection live in `apps/worker/src/change-detection`. Run `pnpm --filter @aperture/worker test -- src/change-detection` for fixture-based diff tests.
- Executed Phase 12 from `12-search.md`: Search live in `apps/api/src/jobs`. Run `pnpm --filter @aperture/api test` for search/filter unit tests. Search via `GET /api/jobs?q=<term>`; combinable with filter params for Phase 14.
- Executed Phase 13 from `13-dashboard.md`: Dashboard shell and jobs UI live in `apps/web`. Run `pnpm --filter @aperture/web build` to verify. Jobs list fetches `GET /api/jobs`; detail panel is client-side only (no route change).
- `@aperture/db` and `@aperture/shared` now compile to `dist/` (required for Node 24 runtime resolution of workspace packages from `apps/api`).
