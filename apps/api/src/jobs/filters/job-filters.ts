import type { EmploymentType, WorkMode } from "@aperture/shared";
import type { Prisma } from "@aperture/db";

export interface JobFilters {
  workMode?: WorkMode;
  country?: string;
  platform?: string;
  visaSponsorship?: boolean;
  employmentType?: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
}

const WORK_MODES = new Set<WorkMode>(["remote", "hybrid", "onsite"]);
const EMPLOYMENT_TYPES = new Set<EmploymentType>([
  "full-time",
  "part-time",
  "contract",
  "internship",
  "temporary",
]);

export function buildJobFilterConstraint(
  filters: JobFilters,
): Prisma.JobWhereInput | undefined {
  const conditions: Prisma.JobWhereInput[] = [];

  if (filters.workMode && WORK_MODES.has(filters.workMode)) {
    conditions.push({ workMode: filters.workMode });
  }

  if (filters.country?.trim()) {
    conditions.push({
      country: { equals: filters.country.trim(), mode: "insensitive" },
    });
  }

  if (filters.platform?.trim()) {
    conditions.push({ sourcePlatform: filters.platform.trim() });
  }

  if (filters.visaSponsorship !== undefined) {
    conditions.push({ visaSponsorship: filters.visaSponsorship });
  }

  if (filters.employmentType && EMPLOYMENT_TYPES.has(filters.employmentType)) {
    conditions.push({ employmentType: filters.employmentType });
  }

  if (filters.salaryMin !== undefined) {
    conditions.push({
      OR: [{ salaryMax: { gte: filters.salaryMin } }, { salaryMax: null }],
    });
  }

  if (filters.salaryMax !== undefined) {
    conditions.push({
      OR: [{ salaryMin: { lte: filters.salaryMax } }, { salaryMin: null }],
    });
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return { AND: conditions };
}
