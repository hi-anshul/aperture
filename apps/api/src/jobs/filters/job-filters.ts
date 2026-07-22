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

/** Canonical search phrases keyed by normalized user input. */
const COUNTRY_ALIASES: Record<string, string[]> = {
  us: ["United States", "United States of America", "USA"],
  usa: ["United States", "United States of America", "USA"],
  "u.s.": ["United States", "United States of America", "USA"],
  "u.s.a.": ["United States", "United States of America", "USA"],
  "united states": ["United States", "United States of America", "USA"],
  "united states of america": [
    "United States",
    "United States of America",
    "USA",
  ],
  uk: ["United Kingdom", "Great Britain", "UK"],
  "u.k.": ["United Kingdom", "Great Britain", "UK"],
  "united kingdom": ["United Kingdom", "Great Britain", "UK"],
  "great britain": ["United Kingdom", "Great Britain", "UK"],
};

const US_LOCATION_PREFIXES = ["US -", "US-", "USA -", "USA-"] as const;

export function buildCountryFilterConstraint(
  country: string,
): Prisma.JobWhereInput | undefined {
  const term = country.trim();
  if (!term) {
    return undefined;
  }

  const normalized = term.toLowerCase();
  const phrases = COUNTRY_ALIASES[normalized] ?? [term];
  const conditions: Prisma.JobWhereInput[] = [];

  for (const phrase of phrases) {
    conditions.push(
      { country: { contains: phrase, mode: "insensitive" } },
      { location: { contains: phrase, mode: "insensitive" } },
    );
  }

  // Short US codes must not use bare "contains: US" (matches "Australia").
  if (
    normalized === "us" ||
    normalized === "usa" ||
    normalized === "u.s." ||
    normalized === "u.s.a." ||
    normalized === "united states" ||
    normalized === "united states of america"
  ) {
    conditions.push(
      { country: { equals: "US", mode: "insensitive" } },
      { country: { startsWith: "US-", mode: "insensitive" } },
      { country: { startsWith: "US ", mode: "insensitive" } },
      { country: { contains: " US", mode: "insensitive" } },
      { country: { contains: "-US", mode: "insensitive" } },
      { location: { equals: "US", mode: "insensitive" } },
      ...US_LOCATION_PREFIXES.map(
        (prefix): Prisma.JobWhereInput => ({
          location: { startsWith: prefix, mode: "insensitive" },
        }),
      ),
    );
  }

  if (
    normalized === "uk" ||
    normalized === "u.k." ||
    normalized === "united kingdom" ||
    normalized === "great britain"
  ) {
    conditions.push(
      { country: { equals: "UK", mode: "insensitive" } },
      { country: { equals: "GB", mode: "insensitive" } },
      { location: { startsWith: "UK -", mode: "insensitive" } },
      { location: { startsWith: "UK-", mode: "insensitive" } },
      { location: { startsWith: "GB -", mode: "insensitive" } },
      { location: { startsWith: "GB-", mode: "insensitive" } },
    );
  }

  return { OR: conditions };
}

export function buildJobFilterConstraint(
  filters: JobFilters,
): Prisma.JobWhereInput | undefined {
  const conditions: Prisma.JobWhereInput[] = [];

  if (filters.workMode && WORK_MODES.has(filters.workMode)) {
    conditions.push({ workMode: filters.workMode });
  }

  const countryConstraint = filters.country?.trim()
    ? buildCountryFilterConstraint(filters.country)
    : undefined;
  if (countryConstraint) {
    conditions.push(countryConstraint);
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
