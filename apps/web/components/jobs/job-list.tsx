"use client";

import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { JobListItem } from "@/lib/api/types";
import { JobRow } from "./job-row";
import { JobsPagination } from "./jobs-pagination";

interface JobListProps {
  jobs: JobListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
  selectedJobId: string | null;
  savingJobId: string | null;
  isLoading: boolean;
  hasActiveFilters: boolean;
  fetchError: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelectJob: (job: JobListItem) => void;
  onSaveJob: (job: JobListItem) => void;
}

export function JobList({
  jobs,
  total,
  page,
  pageSize,
  totalPages,
  searchQuery,
  selectedJobId,
  savingJobId,
  isLoading,
  hasActiveFilters,
  fetchError,
  onSearchChange,
  onPageChange,
  onSelectJob,
  onSaveJob,
}: JobListProps) {
  const hasSearch = searchQuery.trim().length > 0;
  const countLabel =
    total === 0
      ? "0 postings"
      : totalPages <= 1
        ? `${total} active posting${total === 1 ? "" : "s"}`
        : `Page ${page} · ${total} posting${total === 1 ? "" : "s"}`;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-[var(--border-default)] bg-[var(--bg-base)]">
      <div className="shrink-0 space-y-3 border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
              Jobs
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {isLoading ? "Updating results…" : countLabel}
            </p>
          </div>
        </div>

        <label className="relative block">
          <span className="sr-only">Search jobs by name</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by job or company name…"
            className="h-9 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--focus-ring)]/30"
          />
        </label>
      </div>

      {fetchError && jobs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]">
            Unable to load jobs. Try adjusting your search or filters, or refresh
            the page.
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-[var(--text-secondary)]">
            {hasSearch || hasActiveFilters
              ? "No jobs match your current search or filters. Try clearing or broadening them."
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
                  isSaving={savingJobId === job.id}
                  onSelect={onSelectJob}
                  onSave={onSaveJob}
                />
              ))}
            </div>
          </ScrollArea>
          <JobsPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            isLoading={isLoading}
            onPageChange={onPageChange}
          />
        </>
      )}
    </section>
  );
}
