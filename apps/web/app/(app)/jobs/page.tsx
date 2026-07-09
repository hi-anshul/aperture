import { JobsView } from "@/components/jobs/jobs-view";
import { fetchJobs } from "@/lib/api/jobs";

export default async function JobsPage() {
  try {
    const { jobs, total } = await fetchJobs();

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <JobsView initialJobs={jobs} initialTotal={total} />
      </div>
    );
  } catch {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Unable to load jobs
          </p>
          <p className="max-w-md text-sm text-[var(--text-muted)]">
            The jobs list could not be fetched. Check that the API is running and
            try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
}
