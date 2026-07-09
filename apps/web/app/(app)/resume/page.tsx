import { ResumeView } from "@/components/resume/resume-view";
import { fetchActiveResume } from "@/lib/api/resumes";

export default async function ResumePage() {
  try {
    const resume = await fetchActiveResume();

    return <ResumeView initialResume={resume} />;
  } catch {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Unable to load resume
        </p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          The active resume could not be fetched. Check that the API is running
          and try refreshing the page.
        </p>
      </main>
    );
  }
}
