import {
  computeDashboardStats,
  RecentActivity,
  SummaryCards,
} from "@/components/dashboard/summary-cards";
import { fetchJobs } from "@/lib/api/jobs";

export default async function DashboardPage() {
  const { jobs } = await fetchJobs();
  const stats = computeDashboardStats(jobs);

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

      <SummaryCards stats={stats} />
      <RecentActivity jobs={jobs} />
    </main>
  );
}
