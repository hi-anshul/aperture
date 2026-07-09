import type { EmploymentType, PlatformType, WorkMode } from "@aperture/shared";

export interface JobFiltersState {
  workMode: WorkMode | null;
  country: string;
  platform: PlatformType | null;
  visaSponsorship: boolean | null;
  employmentType: EmploymentType | null;
  salaryMin: string;
  salaryMax: string;
}

export const EMPTY_JOB_FILTERS: JobFiltersState = {
  workMode: null,
  country: "",
  platform: null,
  visaSponsorship: null,
  employmentType: null,
  salaryMin: "",
  salaryMax: "",
};

export const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export const EMPLOYMENT_TYPE_OPTIONS: {
  value: EmploymentType;
  label: string;
}[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
];

export const PLATFORM_OPTIONS: { value: PlatformType; label: string }[] = [
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "ashby", label: "Ashby" },
  { value: "workday", label: "Workday" },
  { value: "smartrecruiters", label: "SmartRecruiters" },
  { value: "static-html", label: "Static HTML" },
  { value: "react-rendered", label: "React SPA" },
];

export function jobFiltersToQueryParams(
  filters: JobFiltersState,
): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.workMode) {
    params.workMode = filters.workMode;
  }

  const country = filters.country.trim();
  if (country) {
    params.country = country;
  }

  if (filters.platform) {
    params.platform = filters.platform;
  }

  if (filters.visaSponsorship !== null) {
    params.visaSponsorship = String(filters.visaSponsorship);
  }

  if (filters.employmentType) {
    params.employmentType = filters.employmentType;
  }

  const salaryMin = filters.salaryMin.trim();
  if (salaryMin) {
    params.salaryMin = salaryMin;
  }

  const salaryMax = filters.salaryMax.trim();
  if (salaryMax) {
    params.salaryMax = salaryMax;
  }

  return params;
}

export function countActiveFilters(filters: JobFiltersState): number {
  let count = 0;

  if (filters.workMode) count += 1;
  if (filters.country.trim()) count += 1;
  if (filters.platform) count += 1;
  if (filters.visaSponsorship !== null) count += 1;
  if (filters.employmentType) count += 1;
  if (filters.salaryMin.trim()) count += 1;
  if (filters.salaryMax.trim()) count += 1;

  return count;
}

export function countSalaryFilters(filters: JobFiltersState): number {
  let count = 0;
  if (filters.salaryMin.trim()) count += 1;
  if (filters.salaryMax.trim()) count += 1;
  return count;
}
