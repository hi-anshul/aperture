<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aperture

Personal job-search tool: watches curated company careers pages, normalizes postings into one shape, scores them against the user's resume with AI, and surfaces matches on a dashboard. Monorepo: `apps/web` (Next.js 16), `apps/api` (NestJS), `apps/worker` (scheduler + pipeline), `packages/*` (connectors, db, ai, shared, ui).

Build incrementally using a spec-driven workflow. Always implement against the context files — do not infer pipeline behavior, connector logic, or UI patterns from scratch.

## Context Files

Read the relevant file before working in that area:

1. `context/project-overview.md` — product definition, goals, features, and scope
2. `context/architecture-context.md` — system structure, boundaries, storage model, auth model, and invariants
3. `context/aperture-spec.md` — master technical spec: data models, folder structure, connector interface, pipeline, API routes, env vars, build order
4. `context/ui-context.md` — dark-mode theme, colors, typography, layout patterns, and component conventions
5. `context/code-standards.md` — implementation rules per layer (TypeScript, Next.js, NestJS, connectors, AI, styling, testing)
6. `context/ai-workflow-rules.md` — scoping rules, work-splitting guidance, protected files, and doc-sync requirements
7. `context/progress-tracker.md` — current phase, completed work, open questions, and next steps
8. `context/features/` — per-phase implementation specs (Goal, Depends On, Scope, Notes, Acceptance Criteria); see `context/features/README.md` for build order

## Workflow

- Work on one feature unit at a time (one connector, one API resource, one dashboard page).
- Do not combine unrelated system boundaries in a single change (e.g., pipeline + dashboard UI).
- Build and verify the API before its corresponding dashboard page.
- Do not invent product behavior not defined in the context files — resolve ambiguity in the relevant spec before implementing.
- Update `context/progress-tracker.md` after each meaningful implementation change.
- If implementation changes architecture, scope, or standards, update the relevant context file before continuing.
- Confirm `pnpm build` (or `turbo run build`) passes before moving to the next unit.

## Protected Files

Do not modify unless explicitly instructed:

- `components/ui/*` — generated shadcn/ui components
- Applied Prisma migrations — create a new migration instead of editing history
- Third-party library internals (`node_modules`, Prisma client output)

## Key Invariants

- Connectors communicate only through the shared `Connector` interface — never call each other.
- Fetch Engine downloads only; Parser Engine parses only; Normalizer produces canonical `NormalizedJob` shape.
- Deduplication runs before writing new job records; removed postings are soft-deleted (`is_active = false`).
- AI matching and summarization run as queued worker jobs, never synchronously in HTTP handlers.
- `apps/web` calls the NestJS API only — no direct database or connector access.
- Use design tokens from `ui-context.md` — no raw hex colors or inline styles in components.
