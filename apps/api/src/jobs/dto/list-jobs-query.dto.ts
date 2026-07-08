import type { EmploymentType, WorkMode } from "@aperture/shared";
import type { JobFilters } from "../filters/job-filters";

export interface ListJobsQuery extends JobFilters {
  q?: string;
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

export function parseListJobsQuery(
  raw: Record<string, string | string[] | undefined>,
): ListJobsQuery {
  const workMode = readQueryValue(raw, "workMode");
  const employmentType = readQueryValue(raw, "employmentType");

  return {
    q: readQueryValue(raw, "q")?.trim() || undefined,
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
