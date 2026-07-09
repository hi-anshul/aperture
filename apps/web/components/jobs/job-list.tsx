"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { JobListItem } from "@/lib/api/types";
import { JobRow } from "./job-row";

interface JobListProps {
  jobs: JobListItem[];
  total: number;
  selectedJobId: string | null;
  isLoading: boolean;
  hasActiveFilters: boolean;
  fetchError: boolean;
  onSelectJob: (job: JobListItem) => void;
}

export function JobList({
  jobs,
  total,
  selectedJobId,
  isLoading,
  hasActiveFilters,
  fetchError,
  onSelectJob,
}: JobListProps) {
  const countLabel =
    total === jobs.length
      ? `${total} active posting${total === 1 ? "" : "s"}`
      : `${jobs.length} of ${total} posting${total === 1 ? "" : "s"}`;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-[var(--border-default)] bg-[var(--bg-base)]">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">
            Jobs
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {isLoading ? "Updating results…" : countLabel}
          </p>
        </div>
      </div>

      {fetchError && jobs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]">
            Unable to load filtered jobs. Try adjusting your filters or refresh
            the page.
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]">
            {hasActiveFilters
              ? "No jobs match your current filters. Try clearing or broadening them."
              : "No jobs yet. Add companies and run a sync to populate your job list."}
          </p>
        </div>
      ) : (
        <>
          {fetchError ? (
            <div
              role="alert"
              className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2"
            >
              <p className="text-xs text-[var(--text-secondary)]">
                Unable to refresh jobs. Showing previous results — try adjusting
                filters or refresh the page.
              </p>
            </div>
          ) : null}
          <ScrollArea className="min-h-0 flex-1">
            <div className="divide-y divide-[var(--border-default)]">
              {jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isSelected={selectedJobId === job.id}
                  onSelect={onSelectJob}
                />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </section>
  );
}
