# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 0: Product Specification (SDD) — Completed
- Phase 1: Project Setup — Not started

## Current Goal

- Scaffold the monorepo (`apps/web`, `apps/api`, `apps/worker`, `packages/*`) per `aperture-spec.md` §4, and get a clean `pnpm build` passing across all workspaces.

## Completed

- **Phase 0: Product Specification (SDD)**
  - Defined product vision, goals, and core user flow in `project-overview.md`.
  - Defined the connector-based architecture, system boundaries, storage model, auth model, and 20 architectural invariants in `architecture-context.md`.
  - Defined the full technical spec — data models, folder structure, connector interface, platform detection logic, fetch/parse/normalize/dedupe pipeline, scheduler, AI matching, API routes, environment variables, and 10-sprint build order — in `aperture-spec.md`.
  - Defined coding standards per layer (TypeScript, Next.js, NestJS, Connector SDK, AI matching, auth, styling, testing) in `code-standards.md`.
  - Defined the dark-mode design system (colors, typography, layout patterns, job list/detail conventions, match-score and status color semantics) in `ui-context.md`.
  - Defined the spec-driven workflow rules (scoping, splitting work, protected files, doc-sync requirements) in `ai-workflow-rules.md`.
  - Produced a Phase 1 setup reference document (`01-project-setup.md`) covering root monorepo config (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `docker-compose.yml`, `.env.example`) and starter code for `packages/shared`, `packages/connectors`, and `packages/db`.
  - Produced feature-by-feature implementation specs for Phases 2–22 in `features/`, each with Goal, Depends On, Scope, Implementation Notes, and Acceptance Criteria.
  - Added Phase 23 (`features/23-role-targeting.md`) — keyword-based role filtering (e.g. "Product Manager") layered on top of the existing filter and notification pipelines.
  - Project named **Aperture**; all context files and package names updated accordingly.
  - Switched database from local Docker Postgres to **Neon** (managed, cloud-hosted) across `01-project-setup.md`, `aperture-spec.md`, `architecture-context.md`, `project-overview.md`, and `features/22-deployment.md` — motivated by wanting the app reachable online for possible future use by friends.

## In Progress

- None.

## Next Up

- Phase 1: Project Setup
  - Initialize the monorepo from `01-project-setup.md` (root config, `packages/shared`, `packages/connectors`, `packages/db`).
  - Scaffold `apps/web` (Next.js 14, App Router, Tailwind, shadcn/ui).
  - Scaffold `apps/api` (NestJS, module structure per `architecture-context.md`).
  - Scaffold `apps/worker` (Node/TS entrypoint, BullMQ connection, empty scheduler stub).
  - Create a Neon project and capture pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connection strings into `.env`.
  - Bring up `docker compose` (Redis only) and confirm `pnpm db:generate` / `pnpm db:migrate` run cleanly against Neon using the Phase 3 schema.
  - Confirm `pnpm build` passes across all workspaces before moving to Phase 2 (Authentication).

## Open Questions

- Auth approach for MVP: confirmed as session-based single-user (`iron-session` or equivalent) per `architecture-context.md` — revisit if multi-user becomes a near-term goal.
- Object storage for resume uploads: local volume vs. a managed bucket — not yet decided, defer until Phase 16 (Resume Upload).

## Architecture Decisions

- Defaulting application styling to dark mode only with Geist Sans font, per `ui-context.md`.
- Single-user session auth for MVP, with `user_id` foreign keys present from day one so multi-user support is additive later, not a schema rewrite.
- Connectors communicate only through the shared `Connector` interface — the Fetch Engine, Parser Engine, and Normalizer are separate modules with no cross-calls, per `architecture-context.md` invariants #1–#3.
- Removed job postings are soft-deleted (`is_active = false`), never hard-deleted, to keep `sync_history` and analytics accurate over time.
- LinkedIn/Indeed/Naukri connectors deliberately excluded from MVP scope — platform connectors (Greenhouse/Lever/Ashby/Workday) plus generic/Playwright fallbacks cover direct career sites without fighting aggregator anti-scraping measures.
- Database is Neon (managed Postgres), not self-hosted, using separate pooled (`apps/api`) and direct (`apps/worker`, migrations) connection strings — chosen over local Docker Postgres to keep the option open for friends to use the app later without a database-hosting blocker.

## Session Notes

- Completed the full Phase 0 SDD context file set (spec, overview, architecture, code standards, UI context, workflow rules, progress tracker). No application code has been implemented yet — `01-project-setup.md` exists as a reference document only and has not been executed into an actual repository. Ready to begin Phase 1 project setup.
