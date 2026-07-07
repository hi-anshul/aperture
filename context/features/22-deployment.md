# Phase 22 — Deployment

## Goal
Get `web`, `api`, and `worker` running together on a host (VPS or PaaS), connected to Neon (Postgres) and Upstash (Redis), reachable over the internet so it can eventually be shared with friends.

## Depends On
- All prior phases functionally complete

## Scope

### In Scope
- Neon project provisioned (production database), with pooled + direct connection strings captured in production `.env`
- Upstash Redis database provisioned, with TLS URL captured as `REDIS_URL`
- `prisma migrate deploy` run against `DIRECT_URL` as part of the release process
- Process manager or PaaS config to run `web`, `api`, and `worker` in production
- Environment variable checklist for production (`aperture-spec.md` §13)
- Basic health checks for `api` and `worker`
- A reachable public URL/domain (even a simple one) so the app is actually accessible outside your own machine — a prerequisite for friends using it later

### Out of Scope
- Multi-region/HA deployment (single-host app tier is the target; Neon and Upstash handle managed service availability)
- CI/CD pipeline beyond a basic build-and-test workflow
- Actual multi-user support (accounts, per-user data isolation beyond what the schema already allows) — Neon being cloud-hosted just removes the *database* blocker to that later; the auth/UI work for multi-user is a separate, not-yet-scoped effort

## Implementation Notes
- Final architecture: Next.js frontend → reverse proxy → NestJS API, with the Worker running as a sibling process — both `api` and `worker` connect to Neon (pooled and direct respectively) and to Upstash Redis via `REDIS_URL`
- Since Neon and Upstash are already internet-reachable, only the app tier (`web`/`api`/`worker`) needs a host — a small VPS or a platform like Railway/Fly.io works fine for a personal-scale deployment
- Keep `.env.example` in sync with every new environment variable introduced across all phases
- Run `prisma migrate deploy` (not `migrate dev`) against production — `migrate dev` is a local development command and shouldn't touch the production database

## Acceptance Criteria
- [ ] `web`, `api`, and `worker` start from a clean checkout with only `.env` configured (no local Docker required)
- [ ] `api` and `worker` both correctly reach Neon using their respective connection strings (pooled vs. direct)
- [ ] `worker` connects to Upstash Redis via `REDIS_URL`
- [ ] `prisma migrate deploy` applies cleanly against the Neon production database
- [ ] A full sync cycle (scheduler → connector → pipeline → dashboard) works end to end in the deployed environment
- [ ] The app is reachable over a public URL, not just `localhost`
- [ ] Health checks correctly reflect service status
