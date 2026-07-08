"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { JobListItem } from "@/lib/api/types";
import { JobRow } from "./job-row";

interface JobListProps {
  jobs: JobListItem[];
  selectedJobId: string | null;
  onSelectJob: (job: JobListItem) => void;
}

export function JobList({ jobs, selectedJobId, onSelectJob }: JobListProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-[var(--border-default)] bg-[var(--bg-base)]">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">
            Jobs
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {jobs.length} active posting{jobs.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]">
            No jobs yet. Add companies and run a sync to populate your job
            list.
          </p>
        </div>
      ) : (
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
      )}
    </section>
  );
}
