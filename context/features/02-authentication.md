# Phase 2 — Authentication

## Goal
Session-based login protecting the dashboard and API, single-user for MVP, structured so multi-user is additive later.

## Depends On
- Phase 1: Project Setup (monorepo, `apps/web`, `apps/api` scaffolded)

## Scope

### In Scope
- Login page (`apps/web/app/(auth)/login/page.tsx`)
- Session creation/validation (`iron-session` or equivalent) in `apps/api`
- Route protection middleware for `/dashboard`, `/jobs`, `/companies`, `/watchlist`, `/saved`, `/resume`, `/settings` and all non-login API routes
- `users` table (id, email, password hash, created_at) via Prisma
- Logout

### Out of Scope
- Social login / OAuth providers
- Multi-user signup flow (schema supports it, UI does not need to yet)
- Password reset flow (can hardcode/reset manually for single-user MVP)

## Implementation Notes
- Session secret comes from `SESSION_SECRET` env var (see `aperture-spec.md` §13)
- API routes must never trust a client-provided user ID — always resolve identity from the session (`architecture-context.md` invariant on auth)
- Protect routes at the edge (Next.js middleware) and again at the NestJS API layer — don't rely on one alone

## Acceptance Criteria
- [ ] Visiting any protected route while logged out redirects to `/login`
- [ ] Valid credentials create a session and redirect to `/dashboard`
- [ ] Invalid credentials show an error without leaking whether the email exists
- [ ] Logout destroys the session and subsequent requests to protected routes redirect to `/login`
- [ ] API routes reject requests with no/invalid session with 401, not a silent fallback
