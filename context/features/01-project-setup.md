# Phase 1 — Project Setup

Reference doc for scaffolding the Aperture monorepo. Copy the snippets below into place as you build it out.

## Directory structure

```
aperture/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/           # NestJS backend
│   └── worker/         # Scheduler + connectors + AI jobs
├── packages/
│   ├── db/            # Prisma schema + client
│   ├── ui/             # Shared React components
│   ├── connectors/      # Connector SDK (Phase 4)
│   ├── ai/             # AI matching + summary (Phase 17, 21)
│   └── shared/          # Cross-cutting types
├── specs/             # SDD docs (Phase 0 deliverables)
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── .env.example
```

## Root `package.json`

```json
{
  "name": "aperture",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.0.0",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "db:generate": "pnpm --filter @aperture/db prisma:generate",
    "db:migrate": "pnpm --filter @aperture/db prisma:migrate",
    "db:studio": "pnpm --filter @aperture/db prisma:studio"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.5.4",
    "prettier": "^3.3.3",
    "eslint": "^8.57.0"
  }
}
```

## `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

## `.gitignore`

```
node_modules/
.next/
dist/
build/
.env
.env.local
*.log
.turbo/
.DS_Store
coverage/
packages/db/generated/
```

## `.env.example`

```
# --- Database (Neon) ---
# Pooled connection (PgBouncer) — used by apps/api for short-lived request connections.
DATABASE_URL="postgresql://<user>:<password>@<project>-pooler.<region>.aws.neon.tech/aperture?sslmode=require"
# Direct connection — used by apps/worker (long-lived connections) and Prisma migrations.
DIRECT_URL="postgresql://<user>:<password>@<project>.<region>.aws.neon.tech/aperture?sslmode=require"

# --- Redis (Upstash — job queue via BullMQ) ---
# Create a Redis database at console.upstash.com and copy the TLS URL (starts with rediss://).
REDIS_URL="rediss://default:<password>@<endpoint>.upstash.io:6379"

# --- Auth ---
SESSION_SECRET="change-me-to-a-long-random-string"

# --- AI Matching (Phase 17+) ---
ANTHROPIC_API_KEY=""

# --- Notifications (Phase 18+, optional) ---
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# --- App ---
NEXT_PUBLIC_API_URL="http://localhost:4000"
API_PORT=4000
WEB_PORT=3000
```

> **Why Neon over local Postgres:** you mentioned friends might use this eventually. A managed, cloud-hosted database means the data already lives somewhere reachable over the internet — no exposing your own machine's Postgres port, no separate backup strategy, and Neon's branching feature is handy for testing schema changes safely. The tradeoff is a dependency on Neon's uptime/free-tier limits instead of full local control — worth knowing, not a blocker for this use case.
>
> **Why Upstash over local Redis:** same reasoning — the worker's BullMQ queue needs a always-on Redis connection, and a managed Upstash instance avoids running Docker or a local Redis daemon. Use the TLS URL (`rediss://`) from the Upstash console.
>
> **Two connection strings, not one:** Neon recommends a pooled connection (via PgBouncer) for workloads with many short-lived connections — that's `apps/api`, since each request grabs a connection and releases it quickly. Prisma migrations and `apps/worker` (which holds a persistent connection for the scheduler/BullMQ) should use the **direct** connection instead, since pooled connections can behave unexpectedly with Prisma's migration engine and long-lived sessions. That's why the schema below defines both `url` and `directUrl`.

---

## `packages/shared` — cross-cutting types

`package.json`:

```json
{
  "name": "@aperture/shared",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "devDependencies": { "typescript": "^5.5.4" }
}
```

`src/types.ts` — the canonical shapes referenced by Phase 4 (Connector SDK), Phase 7 (Parser Engine), and Phase 8 (Normalizer):

```ts
export type PlatformType =
  | "greenhouse" | "lever" | "ashby" | "workday" | "smartrecruiters"
  | "static-html" | "react-rendered" | "linkedin" | "indeed" | "naukri" | "unknown";

export type EmploymentType = "full-time" | "part-time" | "contract" | "internship" | "temporary";
export type WorkMode = "remote" | "hybrid" | "onsite";

// Raw output straight from a connector, before normalization
export interface RawJob {
  sourcePlatform: PlatformType;
  sourceUrl: string;
  externalId: string;       // ID from the source platform, for de-duping
  raw: Record<string, unknown>; // untouched payload for debugging/reprocessing
}

// Canonical Job shape used everywhere after Phase 8 (Normalizer)
export interface NormalizedJob {
  id: string;
  externalId: string;
  sourcePlatform: PlatformType;
  sourceUrl: string;
  companyId: string;
  title: string;
  description: string;
  location: string | null;
  workMode: WorkMode | null;
  country: string | null;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  visaSponsorship: boolean | null;
  tags: string[];
  postedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string;
  careersUrl: string;
  platform: PlatformType;
  logoUrl: string | null;
}

export interface JobDiff {
  companyId: string;
  newJobs: NormalizedJob[];
  removedJobIds: string[];
  updatedJobs: NormalizedJob[];
}

export interface MatchResult {
  jobId: string;
  resumeId: string;
  score: number; // 0-100
  verdict: "good-match" | "weak-match";
  missingSkills: string[];
  explanation: string;
}
```

---

## `packages/connectors` — Phase 4, the heart of the system

`package.json`:

```json
{
  "name": "@aperture/connectors",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "dependencies": { "@aperture/shared": "workspace:*" },
  "devDependencies": { "typescript": "^5.5.4" }
}
```

`src/connector.ts`:

```ts
import type { Company, RawJob } from "@aperture/shared";

/**
 * Every platform integration (Greenhouse, Lever, Ashby, Workday, generic
 * static HTML, Playwright-rendered, etc.) implements this and ONLY this.
 *
 * Rule from the spec: "Never let connectors talk to each other."
 * Shared cross-cutting concerns (fetching, retries, rate limiting)
 * live in the Fetch Engine (Phase 6), not in the connector itself.
 */
export interface Connector {
  readonly platform: string;

  /** Used by the Platform Detector (Phase 5) to pick the right connector */
  canHandle(careersUrl: string): boolean | Promise<boolean>;

  /** Fetches raw jobs — no normalization here, that's Phase 8 */
  fetch(company: Company): Promise<RawJob[]>;
}

/** Lookup registry so the Scheduler (Phase 10) doesn't hardcode a switch statement */
export class ConnectorRegistry {
  private connectors: Connector[] = [];

  register(connector: Connector): void {
    this.connectors.push(connector);
  }

  async resolve(careersUrl: string): Promise<Connector | undefined> {
    for (const connector of this.connectors) {
      if (await connector.canHandle(careersUrl)) return connector;
    }
    return undefined;
  }

  list(): Connector[] {
    return [...this.connectors];
  }
}
```

---

## `packages/db` — Phase 3 tables as a Prisma schema

`package.json`:

```json
{
  "name": "@aperture/db",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { "@prisma/client": "^5.18.0" },
  "devDependencies": { "prisma": "^5.18.0", "typescript": "^5.5.4" }
}
```

`prisma/schema.prisma` — starter skeleton for the 9 tables named in Phase 3 (`users`, `companies`, `jobs`, `job_sources`, `watchlists`, `notifications`, `saved_jobs`, `resumes`, `sync_history`). Field-level design still belongs in Phase 3 proper, but this is a working starting point:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — used by apps/api
  directUrl = env("DIRECT_URL")     // direct — used by prisma migrate and apps/worker
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())

  watchlists Watchlist[]
  savedJobs  SavedJob[]
  resumes    Resume[]

  @@map("users")
}

model Company {
  id         String   @id @default(uuid())
  name       String
  careersUrl String   @unique
  platform   String
  logoUrl    String?
  createdAt  DateTime @default(now())

  jobSources JobSource[]
  jobs       Job[]
  watchlists Watchlist[]

  @@map("companies")
}

model JobSource {
  id          String    @id @default(uuid())
  companyId   String
  company     Company   @relation(fields: [companyId], references: [id])
  url         String
  platform    String
  lastFetchAt DateTime?
  lastStatus  String?

  @@map("job_sources")
}

model Job {
  id              String    @id @default(uuid())
  externalId      String
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id])
  title           String
  description     String
  location        String?
  workMode        String?
  country         String?
  employmentType  String?
  salaryMin       Int?
  salaryMax       Int?
  salaryCurrency  String?
  visaSponsorship Boolean?
  tags            String[]
  sourceUrl       String
  sourcePlatform  String
  postedAt        DateTime?
  firstSeenAt     DateTime  @default(now())
  lastSeenAt      DateTime  @default(now())
  isActive        Boolean   @default(true)

  savedJobs SavedJob[]

  @@unique([companyId, externalId])
  @@map("jobs")
}

model Watchlist {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, companyId])
  @@map("watchlists")
}

model SavedJob {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id])
  status    String   @default("interested")
  createdAt DateTime @default(now())

  @@unique([userId, jobId])
  @@map("saved_jobs")
}

model Resume {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  fileUrl    String
  skills     String[]
  experience Json?
  education  Json?
  keywords   String[]
  uploadedAt DateTime @default(now())

  @@map("resumes")
}

model Notification {
  id        String    @id @default(uuid())
  userId    String
  type      String
  payload   Json
  channel   String
  sentAt    DateTime?
  createdAt DateTime  @default(now())

  @@map("notifications")
}

model SyncHistory {
  id           String    @id @default(uuid())
  companyId    String
  startedAt    DateTime  @default(now())
  finishedAt   DateTime?
  status       String
  jobsFound    Int       @default(0)
  jobsNew      Int       @default(0)
  jobsRemoved  Int       @default(0)
  errorMessage String?

  @@map("sync_history")
}
```

`src/index.ts` — Prisma client singleton (avoids exhausting connections on Next.js hot reload):

```ts
import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "../generated/client";
```

---

## `packages/ai` and `packages/ui`

Both stay empty at scaffold stage — implemented once there's real data to work with.

`packages/ai/package.json`:

```json
{
  "name": "@aperture/ai",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@aperture/shared": "workspace:*"
  },
  "devDependencies": { "typescript": "^5.5.4" }
}
```

`packages/ui/package.json`:

```json
{
  "name": "@aperture/ui",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "peerDependencies": { "react": "^18.3.0" },
  "devDependencies": { "@types/react": "^18.3.0", "typescript": "^5.5.4" }
}
```

---

## `apps/` — still to scaffold

Not included above since you're doing this part yourself, but for reference:

- **`apps/web`** — Next.js, depends on `@aperture/ui` and `@aperture/shared`
- **`apps/api`** — NestJS, depends on `@aperture/db` and `@aperture/shared`
- **`apps/worker`** — plain Node/TS process, depends on `@aperture/connectors`, `@aperture/db`, `@aperture/ai`

## Getting it running once scaffolded

```bash
pnpm install
cp .env.example .env          # fill in Neon DATABASE_URL, DIRECT_URL, and Upstash REDIS_URL
pnpm db:generate
pnpm db:migrate                # runs against DIRECT_URL
pnpm dev
```

Create the Neon project first (neon.tech → new project → copy both the pooled and direct connection strings into `.env`) before running `pnpm db:migrate`.
