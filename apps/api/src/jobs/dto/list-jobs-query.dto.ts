import type { EmploymentType, WorkMode } from "@aperture/shared";
import type { JobFilters } from "../filters/job-filters";

export const DEFAULT_JOBS_PAGE = 1;
export const DEFAULT_JOBS_PAGE_SIZE = 20;
export const MAX_JOBS_PAGE_SIZE = 50;

export interface ListJobsQuery extends JobFilters {
  q?: string;
  page: number;
  limit: number;
}

const WORK_MODES = new Set<WorkMode>(["remote", "hybrid", "onsite"]);
const EMPLOYMENT_TYPES = new Set<EmploymentType>([
  "full-time",
  "part-time",
  "contract",
  "internship",
  "temporary",
]);

function readQueryValue(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return undefined;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max?: number,
): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  if (max !== undefined && parsed > max) {
    return max;
  }

  return parsed;
}

export function parseListJobsQuery(
  raw: Record<string, string | string[] | undefined>,
): ListJobsQuery {
  const workMode = readQueryValue(raw, "workMode");
  const employmentType = readQueryValue(raw, "employmentType");

  return {
    q: readQueryValue(raw, "q")?.trim() || undefined,
    page: parsePositiveInt(readQueryValue(raw, "page"), DEFAULT_JOBS_PAGE),
    limit: parsePositiveInt(
      readQueryValue(raw, "limit"),
      DEFAULT_JOBS_PAGE_SIZE,
      MAX_JOBS_PAGE_SIZE,
    ),
    workMode:
      workMode && WORK_MODES.has(workMode as WorkMode)
        ? (workMode as WorkMode)
        : undefined,
    country: readQueryValue(raw, "country")?.trim() || undefined,
    platform: readQueryValue(raw, "platform")?.trim() || undefined,
    visaSponsorship: parseOptionalBoolean(
      readQueryValue(raw, "visaSponsorship"),
    ),
    employmentType:
      employmentType &&
      EMPLOYMENT_TYPES.has(employmentType as EmploymentType)
        ? (employmentType as EmploymentType)
        : undefined,
    salaryMin: parseOptionalNumber(readQueryValue(raw, "salaryMin")),
    salaryMax: parseOptionalNumber(readQueryValue(raw, "salaryMax")),
  };
}
