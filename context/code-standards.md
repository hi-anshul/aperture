# Code Standards

## General

* Keep the pipeline modular and connector-driven: fetch, parse, normalize, and dedupe stay in separate modules.
* Fix architectural problems at the source — avoid temporary patches or duplicated pipeline logic.
* Do not mix UI rendering, scraping/parsing logic, and API orchestration in the same module.
* Respect the separation between connectors, the pipeline, the API, and the dashboard.
* Every connector must have a clearly defined responsibility and a fixed interface contract.
* Prefer extensibility over shortcuts — new platform connectors should be easy to add without touching core infrastructure.
* Respect the boundaries defined in `architecture-context.md`.

## TypeScript

* Strict mode is required throughout the project.
* Avoid `any`; use explicit interfaces, discriminated unions, or typed generics.
* Validate all external inputs including fetched HTML/JSON, platform API responses, and AI-generated match results before use.
* Use `interface` for object contracts and shared pipeline schemas.
* Shared types must live inside `packages/shared` and remain framework-agnostic.
* Every connector's raw output must conform to the shared `RawJob` schema; every normalized job must conform to `NormalizedJob`.

## Next.js (`apps/web`)

* Default to React Server Components.
* Add `"use client"` only for interactive filter controls, drag-and-drop (saved jobs board), hooks, or live state updates.
* The web app never queries the database or a connector directly — it calls the NestJS API only.
* Use server actions or shared service modules for reusable data-fetching logic within `apps/web`.

## NestJS (`apps/api`)

* Keep route handlers thin and focused on orchestration only.
* No scraping, parsing, or scheduling logic lives in `apps/api` — that belongs to `apps/worker` and `packages/connectors`.
* Use modules/services per resource (`companies`, `jobs`, `watchlists`, `saved-jobs`, `resumes`, `notifications`), matching the folder structure in `architecture-context.md`.
* DTOs validate all incoming request bodies before they reach a service.

## Connector SDK & Pipeline (`packages/connectors`, `apps/worker`)

* Every connector implements the `Connector` interface exactly: `platform`, `canHandle()`, `fetch()`.
* Connectors must never import or call another connector.
* The Fetch Engine handles retries, timeouts, rate limiting, and browser automation — connectors never implement their own HTTP/retry logic.
* Parsers are pure functions: raw content in, `RawJob[]` out — no network calls inside a parser.
* Normalization logic for a platform lives in one place; do not scatter field-mapping logic across the parser and the normalizer.
* Deduplication keys on `(companyId, externalId)` first, falling back to fuzzy matching only when no external ID match exists.
* Change detection must diff against the current `jobs` table state, not a separately maintained cache that can drift.
* Every new connector requires a fixture (sample raw response) for isolated testing before being wired into the scheduler.

## AI Matching & Summarization (`packages/ai`)

* AI-generated output (match scores, summaries) must always be schema-validated before persistence.
* Never trust raw LLM output directly — parse and validate against the `MatchResult` schema.
* Keep prompts deterministic and version-controlled in `packages/ai`.
* Matching and summarization run as queued worker jobs, never synchronously inside an API route.
* Prompt templates belong in isolated AI service modules, not inline in route handlers or worker task files.

## Scheduler & Queue

* Scheduling logic must remain deterministic and replayable — re-running a sync for a company must be safe and idempotent.
* Each queued job (per-company sync, AI match, notification dispatch) should be isolated and independently retryable.
* Context passed between pipeline stages (fetch → parse → normalize → dedupe → notify) must be explicit and typed, not implicit shared state.
* Sync status updates (`sync_history`) should be persisted incrementally for observability, not only at the end of a run.

## Authentication & Authorization

* Authentication is session-based; never trust a client-provided user ID.
* Protect all dashboard and API routes except login.
* Enforce ownership checks before resume, watchlist, and saved-job mutations once multi-user support is added.
* Notification channel secrets (Telegram token, etc.) must never be exposed to the client.

## API Routes

* Validate and parse request input before business logic executes.
* Enforce authentication checks before all mutations.
* Return consistent response shapes across all endpoints.
* Keep API handlers orchestration-focused; delegate real work to services in `apps/api/src/*`.
* Shared validation logic belongs in reusable modules, not duplicated per route.

## Data and Storage

* Relational job/company/user metadata belongs in PostgreSQL via Prisma.
* Removed postings are marked `is_active = false`, never hard-deleted.
* Large raw fetch payloads (full HTML/JSON responses) should not be persisted beyond what's needed for debugging a failed parse.
* Resume files are stored in object storage/volume; extracted structured data lives in Postgres.
* Never log raw fetched HTML at length, API tokens, or notification channel secrets.
* Sync history records are first-class, append-only, and must remain traceable.

## Connectors & Integrations

* Every platform connector must have:
  * a dedicated implementation file/module
  * typed raw-response handling
  * isolated parsing logic
* Connector failures must produce structured errors that `sync_history` can record (`status`, `error_message`).
* Connectors should never directly depend on UI components or API route handlers.
* Keep connectors replaceable and loosely coupled from the scheduler and dedupe engine.

## State Management

* Zustand is the single source of truth for dashboard filter and UI state.
* Avoid prop drilling for filter state across the jobs list and detail panel.
* Separate transient UI state (open panels, selected filters) from persisted data (jobs, saved-job status) fetched from the API.
* Derived state (e.g., filtered job count) should be computed, not duplicated in the store.

## Styling

* Use design tokens and semantic Tailwind utilities defined in `globals.css` per `ui-context.md`.
* Avoid hardcoded color values and inconsistent spacing.
* Maintain consistent radius scale:
  * `rounded-xl` for controls
  * `rounded-2xl` for panels/cards
  * `rounded-3xl` for modals and overlays
* Match-score and status colors must remain consistent by category:
  * Green = good match / applied
  * Blue = default / interested
  * Yellow = weak match / pending
  * Red = rejected / sync failed

## File Organization

* `apps/web/app/` — routes, layouts, page composition.
* `apps/api/src/` — NestJS modules, one per resource.
* `apps/worker/src/` — scheduler, fetch/parse/normalize/dedupe pipeline, AI jobs.
* `packages/connectors/` — Connector SDK and platform implementations.
* `packages/db/` — Prisma schema and client.
* `packages/ai/` — prompt templates and matching/summarization logic.
* `packages/ui/` — shared React components.
* `packages/shared/` — cross-cutting types.
* Name files after business responsibility, not framework implementation details.

## Performance

* Avoid unnecessary re-fetching of unchanged companies — respect `lastFetchAt` and the configured sync interval.
* Batch AI matching calls where possible instead of one request per job.
* Debounce dashboard filter changes before re-querying the API.
* Minimize database queries in hot paths (job list) through proper indexing (`company_id`, `is_active`, `posted_at`).

## Security

* Encrypt any stored third-party credentials (future OAuth integrations) before persistence.
* Never expose API keys or session secrets to the browser.
* Validate all fetched external content before it enters the parsing pipeline.
* Sanitize AI-generated summaries before rendering (no unescaped HTML).
* Apply rate limiting to connector fetches per site's policy and to the AI matching queue.
* Maintain auditability for sync runs via `sync_history`.

## Testing

* Test each connector independently using fixture data (saved sample responses), not live network calls.
* Normalizer and dedupe engine require deterministic unit tests with known inputs/outputs.
* Change detection logic should be tested against fixed before/after job sets.
* AI matching and summarization wrappers must support mocked responses for testing.
* Critical pipeline paths (fetch → parse → normalize → dedupe → change detection) should have end-to-end tests using fixture companies.
