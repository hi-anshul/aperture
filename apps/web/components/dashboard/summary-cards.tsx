import type { AnalyticsResponse, JobListItem } from "@/lib/api/types";
import { WindowSelector } from "./window-selector";

interface SummaryCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

function SummaryCard({ label, value, hint }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</p>
      ) : null}
    </div>
  );
}

function formatAverageMatch(score: number | null): string {
  if (score == null) {
    return "—";
  }

  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function SummaryCards({ analytics }: { analytics: AnalyticsResponse }) {
  const windowLabel =
    analytics.windowDays === 7 ? "last 7 days" : "last 30 days";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Metrics for jobs first seen in the {windowLabel}
        </p>
        <WindowSelector windowDays={analytics.windowDays} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Jobs found"
          value={analytics.jobsFound}
          hint={`New postings in the ${windowLabel}`}
        />
        <SummaryCard
          label="Applied"
          value={analytics.applied}
          hint="Saved with Applied status"
        />
        <SummaryCard
          label="Ignored"
          value={analytics.ignored}
          hint="Seen but never saved"
        />
        <SummaryCard
          label="Companies hiring"
          value={analytics.companiesHiring}
          hint="Active companies with open roles"
        />
        <SummaryCard
          label="Avg match score"
          value={formatAverageMatch(analytics.averageMatchScore)}
          hint={
            analytics.averageMatchScore == null
              ? "No scored jobs in this window"
              : "Average over scored jobs only"
          }
        />
      </div>
    </section>
  );
}

export function RecentActivity({ jobs }: { jobs: JobListItem[] }) {
  const recent = [...jobs]
    .sort(
      (a, b) =>
        new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
    )
    .slice(0, 8);

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--border-default)] px-5 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Recent activity
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          New postings and sync updates
        </p>
      </div>

      {recent.length === 0 ? (
        <p className="px-5 py-8 text-sm text-[var(--text-secondary)]">
          No job activity yet. Add companies and run a sync to populate this
          feed.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-default)]">
          {recent.map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {job.title}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {job.company.name}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-[var(--text-secondary)]">
                {new Date(job.firstSeenAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
