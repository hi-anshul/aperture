"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  countActiveFilters,
  countSalaryFilters,
  EMPLOYMENT_TYPE_OPTIONS,
  PLATFORM_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/lib/jobs/filter-types";
import { useJobFiltersStore } from "@/lib/stores/job-filters-store";
import { cn } from "@/lib/utils";
import { FilterSection } from "./filter-section";

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors",
        isActive
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
          : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
      )}
    >
      {label}
    </button>
  );
}

function filterInputClassName() {
  return cn(
    "w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition-colors",
    "placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--focus-ring)]/30",
  );
}

export function FilterSidebar() {
  const filters = useJobFiltersStore();
  const totalActive = useMemo(
    () =>
      countActiveFilters({
        workMode: filters.workMode,
        country: filters.country,
        platform: filters.platform,
        visaSponsorship: filters.visaSponsorship,
        employmentType: filters.employmentType,
        salaryMin: filters.salaryMin,
        salaryMax: filters.salaryMax,
      }),
    [filters],
  );

  const salaryActiveCount = countSalaryFilters({
    workMode: filters.workMode,
    country: filters.country,
    platform: filters.platform,
    visaSponsorship: filters.visaSponsorship,
    employmentType: filters.employmentType,
    salaryMin: filters.salaryMin,
    salaryMax: filters.salaryMax,
  });

  return (
    <aside className="hidden h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden border-r border-[var(--border-default)] bg-[var(--bg-elevated)] lg:flex">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-default)] px-4 py-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Filters
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {totalActive === 0
              ? "No active filters"
              : `${totalActive} active filter${totalActive === 1 ? "" : "s"}`}
          </p>
        </div>
        {totalActive > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={filters.clearAllFilters}
            className="h-7 shrink-0 px-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Clear all
          </Button>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <FilterSection
          title="Work mode"
          activeCount={filters.workMode ? 1 : 0}
          onClear={filters.clearWorkMode}
        >
          <div className="flex flex-wrap gap-2">
            {WORK_MODE_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                isActive={filters.workMode === option.value}
                onClick={() =>
                  filters.setWorkMode(
                    filters.workMode === option.value ? null : option.value,
                  )
                }
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection
          title="Country"
          activeCount={filters.country.trim() ? 1 : 0}
          onClear={filters.clearCountry}
        >
          <input
            type="text"
            value={filters.country}
            onChange={(event) => filters.setCountry(event.target.value)}
            placeholder="e.g. India, United States"
            className={filterInputClassName()}
          />
        </FilterSection>

        <FilterSection
          title="Platform"
          activeCount={filters.platform ? 1 : 0}
          onClear={filters.clearPlatform}
        >
          <select
            value={filters.platform ?? ""}
            onChange={(event) =>
              filters.setPlatform(
                event.target.value
                  ? (event.target.value as typeof filters.platform)
                  : null,
              )
            }
            className={filterInputClassName()}
          >
            <option value="">Any platform</option>
            {PLATFORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterSection>

        <FilterSection
          title="Visa sponsorship"
          activeCount={filters.visaSponsorship !== null ? 1 : 0}
          onClear={filters.clearVisaSponsorship}
        >
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="Any"
              isActive={filters.visaSponsorship === null}
              onClick={() => filters.setVisaSponsorship(null)}
            />
            <FilterChip
              label="Yes"
              isActive={filters.visaSponsorship === true}
              onClick={() => filters.setVisaSponsorship(true)}
            />
            <FilterChip
              label="No"
              isActive={filters.visaSponsorship === false}
              onClick={() => filters.setVisaSponsorship(false)}
            />
          </div>
        </FilterSection>

        <FilterSection
          title="Employment type"
          activeCount={filters.employmentType ? 1 : 0}
          onClear={filters.clearEmploymentType}
        >
          <select
            value={filters.employmentType ?? ""}
            onChange={(event) =>
              filters.setEmploymentType(
                event.target.value
                  ? (event.target.value as typeof filters.employmentType)
                  : null,
              )
            }
            className={filterInputClassName()}
          >
            <option value="">Any type</option>
            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterSection>

        <FilterSection
          title="Salary"
          activeCount={salaryActiveCount}
          onClear={filters.clearSalary}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Min
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={filters.salaryMin}
                onChange={(event) => filters.setSalaryMin(event.target.value)}
                placeholder="50000"
                className={filterInputClassName()}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Max
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={filters.salaryMax}
                onChange={(event) => filters.setSalaryMax(event.target.value)}
                placeholder="150000"
                className={filterInputClassName()}
              />
            </label>
          </div>
        </FilterSection>
      </ScrollArea>
    </aside>
  );
}
