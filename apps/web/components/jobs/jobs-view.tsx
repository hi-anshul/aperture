"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clientFetchJobs } from "@/lib/api/jobs-client";
import { clientSaveJob } from "@/lib/api/saved-jobs-client";
import type { JobListItem } from "@/lib/api/types";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  countActiveFilters,
  jobFiltersToQueryParams,
} from "@/lib/jobs/filter-types";
import { useJobFiltersStore } from "@/lib/stores/job-filters-store";
import { useJobsUiStore } from "@/lib/stores/jobs-ui-store";
import { FilterSidebar } from "./filter-sidebar";
import { JobDetailPanel } from "./job-detail-panel";
import { JobList } from "./job-list";

const FILTER_DEBOUNCE_MS = 300;

interface JobsViewProps {
  initialJobs: JobListItem[];
  initialTotal: number;
}

export function JobsView({ initialJobs, initialTotal }: JobsViewProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [hasHydratedFilters, setHasHydratedFilters] = useState(
    () => useJobFiltersStore.persist.hasHydrated(),
  );

  const selectedJobId = useJobsUiStore((state) => state.selectedJobId);
  const setSelectedJobId = useJobsUiStore((state) => state.setSelectedJobId);

  const filterState = useJobFiltersStore();
  const queryParams = useMemo(
    () =>
      jobFiltersToQueryParams({
        workMode: filterState.workMode,
        country: filterState.country,
        platform: filterState.platform,
        visaSponsorship: filterState.visaSponsorship,
        employmentType: filterState.employmentType,
        salaryMin: filterState.salaryMin,
        salaryMax: filterState.salaryMax,
      }),
    [filterState],
  );
  const debouncedQueryParams = useDebouncedValue(
    queryParams,
    FILTER_DEBOUNCE_MS,
  );
  const debouncedQueryKey = useMemo(
    () => JSON.stringify(debouncedQueryParams),
    [debouncedQueryParams],
  );

  const activeFilterCount = useMemo(
    () =>
      countActiveFilters({
        workMode: filterState.workMode,
        country: filterState.country,
        platform: filterState.platform,
        visaSponsorship: filterState.visaSponsorship,
        employmentType: filterState.employmentType,
        salaryMin: filterState.salaryMin,
        salaryMax: filterState.salaryMax,
      }),
    [filterState],
  );

  const isInitialMount = useRef(true);

  useEffect(() => {
    const unsubscribe = useJobFiltersStore.persist.onFinishHydration(() => {
      setHasHydratedFilters(true);
    });

    if (useJobFiltersStore.persist.hasHydrated()) {
      setHasHydratedFilters(true);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hasHydratedFilters) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;

      if (Object.keys(debouncedQueryParams).length === 0) {
        return;
      }
    }

    let cancelled = false;

    async function loadJobs() {
      setIsLoading(true);
      setFetchError(false);

      try {
        const response = await clientFetchJobs(debouncedQueryParams);
        if (cancelled) {
          return;
        }

        setJobs(response.jobs);
        setTotal(response.total);

        const currentSelectedId = useJobsUiStore.getState().selectedJobId;
        if (
          currentSelectedId &&
          !response.jobs.some((job) => job.id === currentSelectedId)
        ) {
          setSelectedJobId(null);
        }
      } catch {
        if (!cancelled) {
          setFetchError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [debouncedQueryKey, debouncedQueryParams, hasHydratedFilters, setSelectedJobId]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;

  function handleSelectJob(job: JobListItem) {
    setSelectedJobId(job.id);
  }

  function handleClosePanel() {
    setSelectedJobId(null);
  }

  function handleMatchUpdated(updated: JobListItem) {
    setJobs((current) =>
      current.map((job) => (job.id === updated.id ? { ...job, ...updated } : job)),
    );
  }

  function handleSavedUpdated(updated: JobListItem) {
    setJobs((current) =>
      current.map((job) =>
        job.id === updated.id
          ? { ...job, savedJob: updated.savedJob }
          : job,
      ),
    );
  }

  async function handleSaveJob(job: JobListItem) {
    if (job.savedJob || savingJobId) {
      return;
    }

    setSavingJobId(job.id);

    try {
      const saved = await clientSaveJob(job.id, "interested");
      handleSavedUpdated({
        ...job,
        savedJob: { id: saved.id, status: saved.status },
      });
    } catch {
      // Row stays unsaved; user can retry.
    } finally {
      setSavingJobId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <FilterSidebar />
      <JobList
        jobs={jobs}
        total={total}
        selectedJobId={selectedJobId}
        savingJobId={savingJobId}
        isLoading={isLoading}
        hasActiveFilters={activeFilterCount > 0}
        fetchError={fetchError}
        onSelectJob={handleSelectJob}
        onSaveJob={(job) => {
          void handleSaveJob(job);
        }}
      />
      <JobDetailPanel
        job={selectedJob}
        onClose={handleClosePanel}
        onMatchUpdated={handleMatchUpdated}
        onSavedUpdated={handleSavedUpdated}
      />
    </div>
  );
}
