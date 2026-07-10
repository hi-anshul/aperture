import { SavedJobsView } from "@/components/saved/saved-jobs-view";
import { fetchSavedJobs } from "@/lib/api/saved-jobs";

export default async function SavedPage() {
  try {
    const { savedJobs } = await fetchSavedJobs();

    return <SavedJobsView initialSavedJobs={savedJobs} />;
  } catch {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Unable to load saved jobs
        </p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          Saved jobs could not be fetched. Check that the API is running and try
          refreshing the page.
        </p>
      </main>
    );
  }
}
