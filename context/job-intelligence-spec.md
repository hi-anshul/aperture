# Job Intelligence Platform — Master Spec Document
> Personal job-search intelligence tool · Next.js + NestJS + PostgreSQL + Connector SDK · v1.0

---

## 1. Product Overview

Job Intelligence Platform is a self-hosted tool that continuously watches a set of companies' careers pages, normalizes every job posting into one shape, and tells the user which postings are worth their time.

1. User adds companies to a watchlist (careers page URL is enough)
2. A scheduler polls each company's careers page on a fixed interval
3. A platform-specific connector fetches and parses postings
4. Postings are normalized, deduplicated, and diffed against the previous snapshot
5. New/changed postings are matched against the user's resume with Claude
6. High-match or watchlisted postings trigger a notification
7. The user reviews everything in a dashboard: filter, save, track status

**North star scenario:** "Tell me the moment Anthropic or OpenAI posts a Product Manager role, and score how well it matches my resume — without me refreshing their careers page fifteen times a day."

---

## 2. Tech Stack

| Layer | Choice | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Dashboard UI, filters, job detail views |
| API | NestJS | Auth, CRUD for companies/watchlist/saved jobs/resumes, read access to job data |
| Worker | Node/TS long-running process | Scheduler, connectors, fetch/parse/normalize/dedupe pipeline, AI matching jobs |
| Database | PostgreSQL (via Prisma) | Companies, jobs, watchlists, saved jobs, resumes, sync history |
| Queue | Redis + BullMQ | Scheduling recurring fetch jobs, retry/backoff, rate limiting per company |
| Browser automation | Playwright | Fallback fetcher for JS-heavy / React-rendered careers pages |
| AI | Anthropic Claude API | Resume ↔ job match scoring, job description summarization |
| Search | PostgreSQL full-text (MVP) → Meilisearch (later) | Title/location/company/tag search |
| Auth | Session-based, single-user MVP (`iron-session`) | Protects dashboard and API; designed to extend to multi-user later |
| Styling | Tailwind CSS + shadcn/ui | UI |
| State | Zustand | Dashboard filter state, saved-job status transitions |
| Deploy | Docker Compose (self-hosted) | Postgres + Redis + api + worker + web, single `docker compose up` |

---

## 3. Data Models

### `companies`
```sql
id           uuid primary key default gen_random_uuid()
name         text not null
careers_url  text unique not null
platform     text not null        -- 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'static-html' | 'react-rendered' | 'unknown'
logo_url     text
created_at   timestamptz default now()
```

### `job_sources`
```sql
id             uuid primary key default gen_random_uuid()
company_id     uuid references companies
url            text not null
platform       text not null
last_fetch_at  timestamptz
last_status    text            -- 'success' | 'failed' | 'partial'
```

### `jobs`
```sql
id                uuid primary key default gen_random_uuid()
external_id       text not null          -- ID from the source platform
company_id        uuid references companies
title             text not null
description       text not null
location          text
work_mode         text                   -- 'remote' | 'hybrid' | 'onsite'
country           text
employment_type   text                   -- 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary'
salary_min        integer
salary_max        integer
salary_currency   text
visa_sponsorship  boolean
tags              text[]
source_url        text not null
source_platform   text not null
posted_at         timestamptz
first_seen_at     timestamptz default now()
last_seen_at      timestamptz default now()
is_active         boolean default true
unique (company_id, external_id)
```

### `watchlists`
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references users
company_id  uuid references companies
created_at  timestamptz default now()
unique (user_id, company_id)
```

### `saved_jobs`
```sql
id         uuid primary key default gen_random_uuid()
user_id    uuid references users
job_id     uuid references jobs
status     text default 'interested'   -- 'interested' | 'applied' | 'rejected'
created_at timestamptz default now()
unique (user_id, job_id)
```

### `resumes`
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references users
file_url    text not null
skills      text[]
experience  jsonb
education   jsonb
keywords    text[]
uploaded_at timestamptz default now()
```

### `notifications`
```sql
id         uuid primary key default gen_random_uuid()
user_id    uuid references users
type       text not null    -- 'new-job' | 'high-match' | 'dream-company'
payload    jsonb not null
channel    text not null    -- 'email' | 'push' | 'telegram'
sent_at    timestamptz
created_at timestamptz default now()
```

### `sync_history`
```sql
id             uuid primary key default gen_random_uuid()
company_id     uuid references companies
started_at     timestamptz default now()
finished_at    timestamptz
status         text          -- 'success' | 'failed' | 'partial'
jobs_found     integer default 0
jobs_new       integer default 0
jobs_removed   integer default 0
error_message  text
```

---

## 4. Folder Structure

```
job-intelligence/
├── apps/
│   ├── web/                          -- Next.js dashboard
│   │   └── app/
│   │       ├── (auth)/login/page.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── jobs/page.tsx
│   │       ├── companies/page.tsx
│   │       ├── watchlist/page.tsx
│   │       ├── saved/page.tsx
│   │       ├── resume/page.tsx
│   │       └── settings/page.tsx
│   ├── api/                          -- NestJS backend
│   │   └── src/
│   │       ├── auth/
│   │       ├── companies/
│   │       ├── jobs/
│   │       ├── watchlists/
│   │       ├── saved-jobs/
│   │       ├── resumes/
│   │       └── notifications/
│   └── worker/                       -- scheduler + pipeline + AI jobs
│       └── src/
│           ├── scheduler/
│           ├── fetch-engine/
│           ├── parser-engine/
│           ├── normalizer/
│           ├── dedupe-engine/
│           ├── change-detection/
│           └── ai-jobs/
├── packages/
│   ├── db/                           -- Prisma schema + client
│   ├── ui/                           -- shared React components
│   ├── connectors/                   -- Connector SDK + platform connectors
│   │   └── src/
│   │       ├── connector.ts          -- Connector interface + registry
│   │       ├── platform-detector.ts
│   │       ├── greenhouse/
│   │       ├── lever/
│   │       ├── ashby/
│   │       ├── workday/
│   │       ├── static-html/
│   │       └── react-rendered/
│   ├── ai/                           -- match scoring + summarization
│   └── shared/                       -- cross-cutting types
├── specs/                            -- SDD context files (this document set)
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

---

## 5. Connector Types (MVP)

### Platform connectors
| Connector | ID | Description |
|---|---|---|
| Greenhouse | `greenhouse` | Job board API (`boards-api.greenhouse.io`), stable JSON responses |
| Lever | `lever` | Public postings API (`api.lever.co/v0/postings/...`) |
| Ashby | `ashby` | Public job board API |
| Workday | `workday` | CXS API endpoint pattern, varies by tenant |

### Fallback connectors
| Connector | ID | Description |
|---|---|---|
| Generic static HTML | `static-html` | Fetches HTML, parses with a configurable CSS-selector map |
| Browser-rendered | `react-rendered` | Playwright renders the page, then reuses the static HTML parser |

Rule from the spec: **connectors never call each other.** Each one is self-contained — given a `Company`, it returns `RawJob[]`. Shared concerns (retries, rate limiting, timeouts) live in the Fetch Engine, not in individual connectors.

---

## 6. Connector SDK Schema

```typescript
// packages/connectors/src/connector.ts

export interface Connector {
  readonly platform: string
  canHandle(careersUrl: string): boolean | Promise<boolean>
  fetch(company: Company): Promise<RawJob[]>
}

export interface RawJob {
  sourcePlatform: PlatformType
  sourceUrl: string
  externalId: string
  raw: Record<string, unknown>
}
```

### Normalized job shape (post Phase 8)

```typescript
// packages/shared/src/types.ts

export interface NormalizedJob {
  id: string
  externalId: string
  sourcePlatform: PlatformType
  sourceUrl: string
  companyId: string
  title: string
  description: string
  location: string | null
  workMode: 'remote' | 'hybrid' | 'onsite' | null
  country: string | null
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary' | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  visaSponsorship: boolean | null
  tags: string[]
  postedAt: Date | null
  firstSeenAt: Date
  lastSeenAt: Date
  isActive: boolean
}
```

---

## 7. Platform Detection

### `packages/connectors/src/platform-detector.ts`

Given a `careersUrl`, determine which connector should run:

1. Check for known URL patterns first (fast path, no network call):
   - `*.greenhouse.io`, `boards.greenhouse.io/*` → `greenhouse`
   - `jobs.lever.co/*` → `lever`
   - `jobs.ashbyhq.com/*` → `ashby`
   - `*.myworkdayjobs.com/*` → `workday`
2. If no pattern matches, fetch the page once and inspect:
   - Presence of known platform JS bundles/meta tags → route to the matching platform connector
   - Static HTML with job listings in initial payload → `static-html`
   - Empty/near-empty initial HTML, content only appears after JS execution → `react-rendered`
3. If nothing matches confidently, mark company `platform: 'unknown'` and surface it in Settings for manual override.

Detection result is cached on the `companies.platform` column so it only runs once per company (re-run manually if a company migrates ATS platforms).

---

## 8. Fetch → Parse → Normalize → Dedupe Pipeline

### Fetch Engine (`apps/worker/src/fetch-engine`)
Responsible **only** for downloading pages. Supports plain HTTP and Playwright browser automation, retry with backoff, timeout, per-company rate limiting, and polite User-Agent rotation only where a site's policy allows it. **Does no parsing.**

### Parser Engine (`apps/worker/src/parser-engine`)
One parser per platform. Input: raw HTML/JSON. Output: `RawJob[]`. A parser never fetches — it only transforms content it's handed.

### Normalizer (`apps/worker/src/normalizer`)
Every parser returns platform-specific fields. The normalizer maps each platform's raw shape into the single `NormalizedJob` shape. This is the only place platform-specific field names are translated into canonical ones.

### Dedupe Engine (`apps/worker/src/dedupe-engine`)
The same job can appear from multiple sources (e.g., a company's own Greenhouse page and a LinkedIn repost). Dedupe merges these into one canonical job record — keyed first on `(companyId, externalId)`, falling back to a title+company+location fuzzy match across sources.

---

## 9. Scheduler & Change Detection

### Scheduler (`apps/worker/src/scheduler`)
Runs on a fixed interval (default: every 4 hours), enumerates companies, resolves each to a connector via the Platform Detector, and enqueues a fetch job per company in BullMQ. No UI involvement — this is a pure background loop.

```typescript
async function runScheduledSync() {
  const companies = await db.company.findMany()
  for (const company of companies) {
    await fetchQueue.add('sync-company', { companyId: company.id })
  }
}
```

### Change Detection (`apps/worker/src/change-detection`)
Before overwriting job data, the previous snapshot for a company is loaded and diffed against the freshly normalized set:

```typescript
interface JobDiff {
  companyId: string
  newJobs: NormalizedJob[]
  removedJobIds: string[]
  updatedJobs: NormalizedJob[]
}
```

`newJobs` feed the notification pipeline and AI matching queue. `removedJobIds` flip `is_active` to `false` rather than deleting rows (keeps `sync_history` meaningful).

---

## 10. AI Matching & Summarization

### Match scoring: `POST` (internal worker job, not a public route)

**System prompt to Claude:**
```
You are the Job Intelligence Platform's matching engine. Given a resume
summary and a job posting, score how well the candidate matches the role.

Output ONLY valid JSON matching this schema:
{
  "score": number,              // 0-100
  "verdict": "good-match" | "weak-match",
  "missingSkills": string[],
  "explanation": string          // 1-2 sentences
}

Be honest about gaps. A generic resume should not score above 60 unless
the fit is genuinely strong. Return only the JSON object.
```

Runs automatically whenever `newJobs` are found for a watchlisted company, or on demand from the dashboard.

### Job summarization (Phase 21)
Long job descriptions are compressed into: Role, Requirements, Responsibilities, Salary, Benefits, Apply Link — shown as a structured card instead of a wall of text on the job detail view.

---

## 11. Key UI Screens

### 11.1 Dashboard (`/dashboard`)
- Summary cards: jobs found this week, high matches, companies hiring, average match score
- Recent activity feed (new postings, removed postings)

### 11.2 Jobs (`/jobs`)
- Filterable, sortable list: remote/hybrid/onsite, country, experience, salary, platform, visa sponsorship, employment type
- Each row: title, company, location badge, match score badge, posted date
- Click → job detail panel with AI summary + full description

### 11.3 Companies (`/companies`)
- All tracked companies with platform badge, last sync time, last sync status
- "Add company" — paste a careers URL, platform is auto-detected

### 11.4 Watchlist (`/watchlist`)
- Starred companies get checked every sync cycle regardless of global filters
- Toggle notifications per company

### 11.5 Saved (`/saved`)
- Kanban-lite view: Interested / Applied / Rejected
- Drag between columns updates `saved_jobs.status`

### 11.6 Resume (`/resume`)
- Upload PDF → extracted skills/experience/education/keywords shown for review
- One active resume at a time for MVP

### 11.7 Settings (`/settings`)
- Notification channel config (email / push / Telegram)
- Manual platform override for `unknown` companies
- Sync interval

---

## 12. API Routes Summary

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Session login |
| GET | `/api/companies` | List tracked companies |
| POST | `/api/companies` | Add a company (triggers platform detection) |
| DELETE | `/api/companies/:id` | Remove a company |
| GET | `/api/jobs` | List jobs (filters as query params) |
| GET | `/api/jobs/:id` | Job detail incl. AI summary + match score |
| POST | `/api/watchlists` | Add company to watchlist |
| DELETE | `/api/watchlists/:id` | Remove from watchlist |
| POST | `/api/saved-jobs` | Save a job with a status |
| PATCH | `/api/saved-jobs/:id` | Update status (interested/applied/rejected) |
| POST | `/api/resumes` | Upload resume, triggers extraction |
| GET | `/api/analytics` | Jobs found, applied, ignored, companies hiring, avg match |

The worker exposes no public HTTP routes — it only reads/writes the database and pushes to the notification channel directly.

---

## 13. Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/job_intelligence

# Redis
REDIS_URL=redis://localhost:6379

# Auth
SESSION_SECRET=

# Anthropic
ANTHROPIC_API_KEY=

# Notifications (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# App
NEXT_PUBLIC_API_URL=http://localhost:4000
API_PORT=4000
WEB_PORT=3000
```

---

## 14. Build Order (10 Sprints)

| Sprint | Build |
|---|---|
| 1 | SDD specs, architecture, monorepo scaffold |
| 2 | Database, authentication, dashboard shell |
| 3 | Connector SDK + Greenhouse connector |
| 4 | Lever + Ashby + Workday connectors |
| 5 | Generic HTML parser + Playwright fallback connector |
| 6 | Scheduler, worker, sync history, change detection |
| 7 | Search, filters, deduplication, watchlists |
| 8 | Resume parsing, AI matching, job summaries |
| 9 | Notifications, analytics, saved jobs |
| 10 | Polish, testing, deployment, documentation |

---

## 15. Out of Scope for MVP

- Multi-user accounts (single-user session auth only; schema supports it later)
- LinkedIn/Indeed/Naukri connectors (aggregator sites actively block scraping; platform connectors cover most direct career sites)
- Meilisearch (Postgres full-text search is enough at MVP scale)
- Real-time streaming sync progress (polling `sync_history` is enough)
- Browser extension or mobile app
- Auto-apply / application automation

---

*Last updated: July 2026 · Job Intelligence Platform v1.0 MVP spec*
