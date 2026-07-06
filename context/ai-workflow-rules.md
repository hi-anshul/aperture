# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. The context files in this set (`aperture-spec.md`, `project-overview.md`, `architecture-context.md`, `code-standards.md`, `ui-context.md`, `progress-tracker.md`) define what to build, how to build it, and the current state of progress. Always implement against these specs — do not infer or invent pipeline behavior, connector logic, or UI patterns from scratch.

## Scoping Rules

- Work on one feature unit at a time (e.g., one connector, one API resource, one dashboard page)
- Prefer small, verifiable increments over large speculative changes
- Do not combine unrelated system boundaries in a single implementation step — e.g., don't touch the Fetch Engine and the dashboard filter UI in the same change

## When to Split Work

Split an implementation step if it combines:

- Pipeline changes (fetch/parse/normalize/dedupe) and UI changes
- Multiple unrelated connectors (e.g., Greenhouse and Lever) in one step
- A new API resource and its corresponding dashboard page — build and verify the API first
- Behavior not clearly defined in the context files (e.g., an undocumented edge case in change detection)

If a change cannot be verified end to end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files (e.g., don't guess at a notification's exact copy or a new filter field)
- If a requirement is ambiguous, resolve it in the relevant context file before implementing — update `aperture-spec.md` or `architecture-context.md` as needed
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*` — generated shadcn/ui library components
- `packages/db/prisma/schema.prisma` migrations already applied — create a new migration instead of editing history
- Any third-party library internals (Prisma client output, node_modules)

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries → `architecture-context.md`
- Storage model or schema decisions → `aperture-spec.md` and `architecture-context.md`
- Code conventions or standards → `code-standards.md`
- Feature scope → `project-overview.md`
- Visual/design decisions → `ui-context.md`

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope
2. No invariant defined in `architecture-context.md` was violated
3. `progress-tracker.md` reflects the completed work
4. `pnpm build` (or `turbo run build`) passes across the monorepo
