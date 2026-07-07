# Aperture

## Overview

Aperture is a personal job-search tool that watches a curated list of companies' careers pages, normalizes every posting it finds into one consistent shape, and scores each one against the user's resume using AI. Instead of manually re-checking a dozen careers pages, the user gets a single dashboard of everything new, ranked by fit, with notifications for the postings that matter most. It solves the "constant refreshing" problem of a targeted job search by combining platform-aware scraping with AI-driven relevance scoring.

## Goals

1. Track an arbitrary list of companies' careers pages and detect new/changed postings automatically, without manual re-checking.
2. Score every new posting against the user's resume and surface only the ones worth their attention.
3. Provide a connector architecture where adding support for a new careers platform is a matter of implementing one connector, not rewriting the crawler.

## Core User Flow

1. User logs into the dashboard.
2. User adds a company by pasting its careers page URL.
3. The platform is auto-detected and the company is added to the tracking list.
4. User optionally stars the company on their watchlist for priority notifications.
5. User uploads a resume; skills, experience, and keywords are extracted once.
6. The scheduler polls each company on a fixed interval, running the matching connector.
7. New or changed postings are normalized, deduplicated, and diffed against the last snapshot.
8. New postings are scored against the resume via Claude.
9. High-match or watchlisted-company postings trigger a notification (email/push/Telegram).
10. User reviews the dashboard: filters, saves jobs as Interested/Applied/Rejected, checks analytics.

## Features

### Connector-Based Job Discovery

* Platform-specific connectors for Greenhouse, Lever, Ashby, and Workday cover most modern career sites with stable integrations.
* Generic static-HTML connector and a Playwright-rendered fallback connector cover everything else.
* Adding a new platform means implementing one connector against a fixed interface — the rest of the pipeline is untouched.

### Fetch → Parse → Normalize → Dedupe Pipeline

* Fetch Engine handles downloading only (HTTP + browser automation, retries, rate limiting).
* Parser Engine converts raw content into jobs, one parser per platform.
* Normalizer maps every platform's fields into a single canonical `Job` shape.
* Dedupe Engine merges the same posting seen from multiple sources.

### Scheduler & Change Detection

* Background scheduler polls every tracked company on a fixed interval — no UI involvement.
* Change detection diffs today's snapshot against yesterday's: new jobs, removed jobs, updated jobs.

### AI Matching & Summarization

* Every new posting is scored 0–100 against the user's resume via the Anthropic Claude API, with an explanation and a list of missing skills.
* Long job descriptions are compressed into a structured summary: Role, Requirements, Responsibilities, Salary, Benefits, Apply Link.

### Dashboard & Filters

* Filterable job list: remote/hybrid/onsite, country, experience, salary, platform, visa sponsorship, employment type.
* Company watchlist with per-company notification toggles.
* Saved jobs with three simple states: Interested, Applied, Rejected.
* Analytics: jobs found, applied, ignored, companies hiring, average match score.

### Authentication

* Session-based login, single-user for MVP.
* Schema and auth boundary are designed so multi-user support is a later addition, not a rewrite.

### Notifications

* Email, push, or Telegram — user's choice.
* Triggered by new postings from watchlisted companies or postings above a high-match threshold.

## Scope

### In Scope

* Platform connectors for Greenhouse, Lever, Ashby, Workday.
* Generic static-HTML and Playwright-rendered fallback connectors.
* Scheduled polling, change detection, deduplication.
* Resume upload and extraction.
* AI-powered match scoring and job summarization.
* Filterable dashboard, company watchlist, saved jobs, analytics.
* Email/push/Telegram notifications.
* Self-hosted deployment of `web`, `api`, and `worker` (VPS or PaaS), with Neon (Postgres) and Upstash (Redis).

### Out of Scope

* Multi-user accounts and team features.
* LinkedIn, Indeed, Naukri, or other aggregator connectors (actively anti-scraping; platform connectors cover direct career sites instead).
* Meilisearch or any dedicated search infra (Postgres full-text is sufficient at this scale).
* Real-time streaming sync progress.
* Auto-apply or application automation.
* Mobile app or browser extension.

## Tech Stack

| Layer            | Technology                          |
| ----------------- | ------------------------------------ |
| Frontend          | Next.js 16                          |
| API               | NestJS                              |
| Worker            | Node/TS (scheduler, connectors, AI jobs) |
| Database          | PostgreSQL, Neon (managed) via Prisma |
| Queue             | Redis + BullMQ (Upstash)            |
| Browser automation | Playwright                          |
| AI                | Anthropic Claude API                |
| Auth              | Session-based (single-user MVP)     |
| State Management  | Zustand                             |
| Styling           | Tailwind CSS + shadcn/ui            |
| Deployment        | Self-hosted app tier + Neon + Upstash |

## Success Criteria

1. Adding a company by URL correctly auto-detects its platform and starts tracking it.
2. A scheduled sync run correctly finds new postings, dedupes them against existing sources, and marks removed postings inactive rather than deleting them.
3. A new posting from a watchlisted company triggers a notification within one sync cycle.
4. A resume upload produces usable extracted skills/keywords, and match scores are computed for new postings without manual triggering.
5. The dashboard's filters (remote/location/salary/platform/visa/employment type) correctly narrow the job list.
6. Job data, sync history, and saved-job status all persist correctly across restarts (PostgreSQL is the source of truth, not in-memory state).
7. A new platform connector can be added by implementing the `Connector` interface alone, with no changes required to the scheduler, fetch engine, normalizer, or dedupe engine.
