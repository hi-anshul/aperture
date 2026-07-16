import {
  RecentActivity,
  SummaryCards,
} from "@/components/dashboard/summary-cards";
import { fetchAnalytics } from "@/lib/api/analytics";
import { fetchJobs } from "@/lib/api/jobs";
import type { AnalyticsWindowDays } from "@/lib/api/types";

function parseWindowDays(
  value: string | string[] | undefined,
): AnalyticsWindowDays {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "30" ? 30 : 7;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ windowDays?: string | string[] }>;
}) {
  const params = await searchParams;
  const windowDays = parseWindowDays(params.windowDays);

  try {
    const [analytics, { jobs }] = await Promise.all([
      fetchAnalytics(windowDays),
      fetchJobs(),
    ]);

    return (
      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Overview of tracked companies and recent job activity.
          </p>
        </div>

        <SummaryCards analytics={analytics} />
        <RecentActivity jobs={jobs} />
      </main>
    );
  } catch {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Unable to load dashboard
        </p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          Analytics could not be fetched. Check that the API is running and try
          refreshing the page.
        </p>
      </main>
    );
  }
}
