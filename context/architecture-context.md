# Architecture Context

## Stack

| Layer             | Technology                    | Role                                                                 |
| ------------------ | ------------------------------ | ---------------------------------------------------------------------- |
| Frontend           | Next.js 14 + TypeScript        | Dashboard UI, filters, job/company/resume views                       |
| API                | NestJS + TypeScript            | Auth, CRUD for companies/watchlists/saved jobs/resumes, read access to job data |
| Worker             | Node/TS long-running process   | Scheduler, connectors, fetch/parse/normalize/dedupe pipeline, AI jobs |
| UI                 | Tailwind CSS + shadcn/ui       | Component system and styling foundation                              |
| State Management   | Zustand                        | Dashboard filter state, saved-job status transitions                 |
| Database           | PostgreSQL (Neon, managed)     | Companies, jobs, watchlists, saved jobs, resumes, sync history        |
| ORM / DB Access     | Prisma                         | Schema, migrations, typed queries — shared via `packages/db`          |
| Queue               | Redis + BullMQ                 | Scheduled fetch jobs, retries, per-company rate limiting              |
| Browser Automation  | Playwright                     | Fallback fetcher for JS-heavy / React-rendered careers pages          |
| AI                  | Anthropic Claude API           | Resume-to-job match scoring, job description summarization           |
| Deployment          | Docker Compose (self-hosted app tier) + Neon (managed DB) | Redis + api + worker + web self-hosted; Postgres runs on Neon |
| Styling System      | CSS Variables + Design Tokens  | Consistent design system across dashboard and job cards               |
| Icons               | Lucide React                   | Stroke-based icon system                                              |

## System Boundaries

* `apps/web/app/` — owns routing, layouts, page composition; no direct DB or connector access
* `apps/api/src/` — owns authenticated CRUD endpoints only; no scraping, parsing, or scheduling logic
* `apps/worker/src/scheduler/` — owns the recurring poll loop that enqueues per-company sync jobs; no UI or HTTP surface
* `apps/worker/src/fetch-engine/` — owns downloading pages only (HTTP + Playwright, retries, rate limiting, timeouts); never parses content
* `apps/worker/src/parser-engine/` — owns converting raw content into `RawJob[]`, one parser per platform; never fetches
* `apps/worker/src/normalizer/` — owns mapping every platform's raw fields into the single `NormalizedJob` shape; the only place platform-specific field names are translated
* `apps/worker/src/dedupe-engine/` — owns merging the same posting seen from multiple sources into one canonical record
* `apps/worker/src/change-detection/` — owns diffing today's snapshot against the previous one (new/removed/updated jobs)
* `apps/worker/src/ai-jobs/` — owns queued AI matching and summarization work; consumes `packages/ai`, never called synchronously from a request handler
* `packages/connectors/` — owns the `Connector` interface, the connector registry, the Platform Detector, and every platform-specific connector implementation
* `packages/db/` — owns the Prisma schema, migrations, and the shared database client
* `packages/ai/` — owns Claude prompt templates, match-scoring logic, and summarization logic; provider-agnostic where possible
* `packages/ui/` — owns shared React components (job cards, filter bar, status badges) used by `apps/web`
* `packages/shared/` — owns cross-cutting types (`NormalizedJob`, `RawJob`, `Company`, `JobDiff`, `MatchResult`) with no framework dependencies

## Storage Model

* **PostgreSQL (Neon)**: Stores companies, jobs, job sources, watchlists, saved jobs, resumes, notifications, and sync history — the single source of truth for all persistent state. Managed/cloud-hosted rather than self-run, using a pooled connection for `apps/api` and a direct connection for `apps/worker` and migrations
* **Job Snapshot**: The `jobs` table itself is the snapshot; change detection compares a fresh normalized fetch against existing rows rather than maintaining a separate snapshot table
* **Redis / BullMQ**: Stores queued and scheduled sync jobs, retry state, and per-company rate-limit counters — transient, never a source of truth for job data
* **Resume Storage**: Uploaded resume files stored in object storage (or local volume for self-hosted MVP); extracted skills/experience/keywords stored as structured columns in Postgres
* **Runtime Execution Context**: Transient in-memory state during a single connector run (raw fetch results before normalization); never persisted directly
* **Environment Variables**: API keys, session secret, database/queue connection strings
* **Client State (Zustand)**: Transient dashboard filter selections and optimistic saved-job status updates

## Auth and Access Model

* Session-based authentication, single-user for MVP (`iron-session` or equivalent)
* All dashboard and API routes except the login route require an authenticated session
* The `users` table and `user_id` foreign keys exist from day one so multi-user support is additive later, not a schema rewrite
* API routes must never trust a client-provided user ID — the session is the only source of identity
* The worker has no HTTP surface and is not part of the auth boundary — it runs with direct database access as a trusted background process
* Resume files and extracted resume data are scoped to the owning user only
* Notification channel credentials (Telegram token, etc.) are server-only and never exposed to the client

## Invariants

1. Connectors must never call or depend on each other — each is self-contained and communicates only through the `Connector` interface
2. The Fetch Engine performs no parsing; the Parser Engine performs no fetching — these responsibilities never merge into one module
3. Every platform's raw job fields must pass through the Normalizer before being treated as a canonical `Job` — no downstream code reads platform-specific raw fields directly
4. Deduplication must run before jobs are written as new records — the same posting from two sources must resolve to one row
5. Removed postings are marked `is_active = false`, never hard-deleted, so `sync_history` and analytics remain accurate over time
6. The Scheduler has no UI and no HTTP route — it is a pure background loop triggered on an interval
7. AI matching and summarization run as queued worker jobs, never synchronously inside an HTTP request/response cycle
8. Every connector must define: a `platform` identifier, a `canHandle()` check, and a `fetch()` implementation returning `RawJob[]`
9. API route handlers (`apps/api`) remain orchestration-only and must not contain scraping, parsing, or scheduling logic
10. External data (fetched HTML, platform API responses, AI-generated match results) must always be validated before entering the system
11. Zustand is the single source of truth for dashboard filter and UI state; it never stores job or company data fetched from the API
12. Workflow-equivalent for this project — job data mutations happen through typed API calls only, never direct client-side database access
13. Sync history records are append-only and must remain traceable for debugging failed or partial syncs
14. Connector implementations must remain isolated and independently testable, each with its own fixture data
15. Components in `apps/web` must never directly call a connector or the database — only the API
16. The AI matching prompt and summarization logic must remain provider-agnostic where reasonably possible, to allow swapping the underlying model later
17. No business logic (matching, normalization, deduplication) may live inside UI components
18. The dashboard must remain functional (browsing previously-synced jobs) even if the scheduler or worker is temporarily down
19. The system must remain extensible so a new platform connector can be added without modifying the scheduler, fetch engine, normalizer, or dedupe engine
20. No raw hex colors, inline styles, or hardcoded theme values may appear in application components — use design tokens from `ui-context.md`
