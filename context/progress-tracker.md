# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 0: Product Specification (SDD) — Completed
- Phase 1: Project Setup — Completed (pending Neon `.env` + first migration)

## Current Goal

- Phase 2: Authentication — session-based login (`iron-session`), login page, and protected API routes per `features/02-authentication.md`.

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

## In Progress

- None.

## Next Up

- Phase 2: Authentication (`features/02-authentication.md`)
  - Create a Neon project; copy pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connection strings into `.env`.
  - Run `pnpm db:migrate` against Neon to apply the Phase 3 schema.
  - Add Upstash `REDIS_URL` (TLS `rediss://` URL) to `.env` before running the worker.
  - Initialize shadcn/ui in `apps/web` when building auth UI components.
  - Implement session-based login (`iron-session`), login page, and protected API routes.

## Open Questions

- Auth approach for MVP: confirmed as session-based single-user (`iron-session` or equivalent) per `architecture-context.md` — revisit if multi-user becomes a near-term goal.
- Object storage for resume uploads: local volume vs. a managed bucket — not yet decided, defer until Phase 16 (Resume Upload).

## Architecture Decisions

- Defaulting application styling to dark mode only with Geist Sans font, per `ui-context.md`.
- Single-user session auth for MVP, with `user_id` foreign keys present from day one so multi-user support is additive later, not a schema rewrite.
- Connectors communicate only through the shared `Connector` interface — the Fetch Engine, Parser Engine, and Normalizer are separate modules with no cross-calls, per `architecture-context.md` invariants #1–#3.
- Removed job postings are soft-deleted (`is_active = false`), never hard-deleted, to keep `sync_history` and analytics accurate over time.
- LinkedIn/Indeed/Naukri connectors deliberately excluded from MVP scope — platform connectors (Greenhouse/Lever/Ashby/Workday) plus generic/Playwright fallbacks cover direct career sites without fighting aggregator anti-scraping measures.
- Database is Neon (managed Postgres), not self-hosted, using separate pooled (`apps/api`) and direct (`apps/worker`, migrations) connection strings.
- Redis is Upstash (managed), not self-hosted via Docker — worker connects via `REDIS_URL` (`rediss://` TLS URL).

## Session Notes

- Executed Phase 1 from `01-project-setup.md`: monorepo scaffold is live. Root-level Next.js files removed; app lives under `apps/web`. `pnpm db:migrate` not run yet — requires Neon credentials in `.env`. shadcn/ui init deferred to Phase 2 when auth UI is built.
