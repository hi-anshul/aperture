"use client";

import type { JobListItem } from "@/lib/api/types";
import { useJobsUiStore } from "@/lib/stores/jobs-ui-store";
import { FilterSidebar } from "./filter-sidebar";
import { JobDetailPanel } from "./job-detail-panel";
import { JobList } from "./job-list";

interface JobsViewProps {
  jobs: JobListItem[];
}

export function JobsView({ jobs }: JobsViewProps) {
  const selectedJobId = useJobsUiStore((state) => state.selectedJobId);
  const setSelectedJobId = useJobsUiStore((state) => state.setSelectedJobId);

  const selectedJob =
    jobs.find((job) => job.id === selectedJobId) ?? null;

  function handleSelectJob(job: JobListItem) {
    setSelectedJobId(job.id);
  }

  function handleClosePanel() {
    setSelectedJobId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <FilterSidebar />
      <JobList
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectJob={handleSelectJob}
      />
      <JobDetailPanel job={selectedJob} onClose={handleClosePanel} />
    </div>
  );
}
