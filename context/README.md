# Aperture — Feature Specs

Implementation-order spec files, one per build phase. Each file has: Goal, Depends On, Scope (in/out), Implementation Notes, and Acceptance Criteria.

Work through these in order — each one lists its dependencies so you know what has to land first. Update `../progress-tracker.md` after completing each phase, per `../ai-workflow-rules.md`.

| # | Phase | File |
|---|---|---|
| 1 | Project Setup | `../01-project-setup.md` |
| 2 | Authentication | `02-authentication.md` |
| 3 | Database | `03-database.md` |
| 4 | Connector SDK ⭐ | `04-connector-sdk.md` |
| 5 | Platform Detector | `05-platform-detector.md` |
| 6 | Fetch Engine | `06-fetch-engine.md` |
| 7 | Parser Engine | `07-parser-engine.md` |
| 8 | Normalizer | `08-normalizer.md` |
| 9 | Deduplication Engine | `09-deduplication-engine.md` |
| 10 | Scheduler | `10-scheduler.md` |
| 11 | Change Detection | `11-change-detection.md` |
| 12 | Search | `12-search.md` |
| 13 | Dashboard | `13-dashboard.md` |
| 14 | Filters | `14-filters.md` |
| 15 | Company Watchlist | `15-company-watchlist.md` |
| 16 | Resume Upload | `16-resume-upload.md` |
| 17 | AI Matching | `17-ai-matching.md` |
| 18 | Notifications | `18-notifications.md` |
| 19 | Saved Jobs | `19-saved-jobs.md` |
| 20 | Analytics | `20-analytics.md` |
| 21 | AI Summary | `21-ai-summary.md` |
| 22 | Deployment | `22-deployment.md` |
| 23 | Role Targeting | `23-role-targeting.md` |

Cross-cutting context (read once, reference throughout): `../aperture-spec.md`, `../project-overview.md`, `../architecture-context.md`, `../code-standards.md`, `../ui-context.md`.
