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
import { JOBS_PAGE_SIZE } from "@/lib/jobs/pagination";
import { useJobFiltersStore } from "@/lib/stores/job-filters-store";
import { useJobsUiStore } from "@/lib/stores/jobs-ui-store";
import { FilterSidebar } from "./filter-sidebar";
import { JobDetailPanel } from "./job-detail-panel";
import { JobList } from "./job-list";

const FILTER_DEBOUNCE_MS = 300;

function getFiltersHydrated(): boolean {
  return useJobFiltersStore.persist?.hasHydrated() ?? false;
}

interface JobsViewProps {
  initialJobs: JobListItem[];
  initialTotal: number;
  initialPage?: number;
  initialPageSize?: number;
  initialTotalPages?: number;
}

export function JobsView({
  initialJobs,
  initialTotal,
  initialPage = 1,
  initialPageSize = JOBS_PAGE_SIZE,
  initialTotalPages = initialTotal === 0
    ? 0
    : Math.ceil(initialTotal / initialPageSize),
}: JobsViewProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [hasHydratedFilters, setHasHydratedFilters] = useState(false);

  const selectedJobId = useJobsUiStore((state) => state.selectedJobId);
  const setSelectedJobId = useJobsUiStore((state) => state.setSelectedJobId);

  const filterState = useJobFiltersStore();
  const filterParams = useMemo(
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

  const debouncedSearch = useDebouncedValue(searchQuery, FILTER_DEBOUNCE_MS);
  const debouncedFilterParams = useDebouncedValue(
    filterParams,
    FILTER_DEBOUNCE_MS,
  );

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      ...debouncedFilterParams,
      page: String(page),
      limit: String(JOBS_PAGE_SIZE),
    };

    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch) {
      params.q = trimmedSearch;
    }

    return params;
  }, [debouncedFilterParams, debouncedSearch, page]);

  const debouncedQueryKey = useMemo(
    () => JSON.stringify(queryParams),
    [queryParams],
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
  const filterSearchKey = useMemo(
    () =>
      JSON.stringify({
        filters: debouncedFilterParams,
        q: debouncedSearch.trim(),
      }),
    [debouncedFilterParams, debouncedSearch],
  );
  const [appliedFilterSearchKey, setAppliedFilterSearchKey] =
    useState(filterSearchKey);

  if (appliedFilterSearchKey !== filterSearchKey) {
    setAppliedFilterSearchKey(filterSearchKey);
    if (page !== 1) {
      setPage(1);
    }
  }

  useEffect(() => {
    const persist = useJobFiltersStore.persist;
    if (!persist) {
      setHasHydratedFilters(true);
      return;
    }

    const unsubscribe = persist.onFinishHydration(() => {
      setHasHydratedFilters(true);
    });

    if (getFiltersHydrated()) {
      setHasHydratedFilters(true);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hasHydratedFilters) {
      return;
    }

    // Wait until page resets to 1 after a filter/search change.
    if (appliedFilterSearchKey !== filterSearchKey && page !== 1) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;

      const onlyDefaults =
        Object.keys(debouncedFilterParams).length === 0 &&
        !debouncedSearch.trim() &&
        page === 1;

      if (onlyDefaults) {
        return;
      }
    }

    let cancelled = false;

    async function loadJobs() {
      setIsLoading(true);
      setFetchError(false);

      try {
        const response = await clientFetchJobs(queryParams);
        if (cancelled) {
          return;
        }

        setJobs(response.jobs);
        setTotal(response.total);
        setPage(response.page);
        setPageSize(response.pageSize);
        setTotalPages(response.totalPages);

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
  }, [
    debouncedQueryKey,
    queryParams,
    hasHydratedFilters,
    appliedFilterSearchKey,
    filterSearchKey,
    page,
    debouncedFilterParams,
    debouncedSearch,
    setSelectedJobId,
  ]);

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

  function handleSearchChange(value: string) {
    setSearchQuery(value);
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <FilterSidebar />
      <JobList
        jobs={jobs}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        searchQuery={searchQuery}
        selectedJobId={selectedJobId}
        savingJobId={savingJobId}
        isLoading={isLoading}
        hasActiveFilters={activeFilterCount > 0}
        fetchError={fetchError}
        onSearchChange={handleSearchChange}
        onPageChange={handlePageChange}
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
