import { randomUUID } from "node:crypto";

import type {
  EmploymentType,
  NormalizedJob,
  RawJob,
  WorkMode,
} from "@aperture/shared";

import type { NormalizeContext } from "../types";
import type {
  AshbyCompensation,
  AshbyCompensationSummaryComponent,
  AshbyRawJobPayload,
} from "./types";

export function normalizeAshbyJob(
  rawJob: RawJob,
  context: NormalizeContext,
): NormalizedJob {
  const raw = rawJob.raw as AshbyRawJobPayload;

  const title = normalizeText(raw.title) ?? "Untitled role";
  const description =
    normalizeText(raw.descriptionPlain) ??
    normalizeText(raw.descriptionHtml) ??
    "";
  const location = resolveLocation(raw);
  const workMode = parseWorkMode(
    raw.isRemote,
    normalizeText(raw.workplaceType),
    location,
    description,
  );
  const country = normalizeText(raw.address?.postalAddress?.addressCountry);
  const employmentType = parseEmploymentType(
    normalizeText(raw.employmentType),
    title,
  );
  const salary = parseSalary(raw.compensation);
  const tags = buildTags(raw, employmentType, workMode);
  const postedAt = parsePostedAt(raw.publishedAt);
  const syncedAt = context.syncedAt ?? new Date();

  return {
    id: context.jobId ?? randomUUID(),
    externalId: rawJob.externalId,
    sourcePlatform: rawJob.sourcePlatform,
    sourceUrl: rawJob.sourceUrl,
    companyId: context.companyId,
    title,
    description,
    location,
    workMode,
    country,
    employmentType,
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryCurrency: salary.salaryCurrency,
    visaSponsorship: parseVisaSponsorship(description),
    tags,
    postedAt,
    firstSeenAt: context.firstSeenAt ?? syncedAt,
    lastSeenAt: syncedAt,
    isActive: context.isActive ?? true,
  };
}

function resolveLocation(raw: AshbyRawJobPayload): string | null {
  const primary = normalizeText(raw.location);
  if (primary) {
    return primary;
  }

  if (Array.isArray(raw.secondaryLocations)) {
    for (const secondary of raw.secondaryLocations) {
      const location = normalizeText(secondary.location);
      if (location) {
        return location;
      }
    }
  }

  const locality = normalizeText(raw.address?.postalAddress?.addressLocality);
  const region = normalizeText(raw.address?.postalAddress?.addressRegion);
  if (locality && region) {
    return `${locality}, ${region}`;
  }

  return locality ?? region;
}

function parseWorkMode(
  isRemote: boolean | null | undefined,
  workplaceType: string | null,
  location: string | null,
  description: string,
): WorkMode | null {
  if (isRemote === true) {
    return "remote";
  }

  if (workplaceType) {
    const normalized = workplaceType.toLowerCase().replace(/[_ ]+/g, "-");
    if (normalized === "remote") {
      return "remote";
    }
    if (normalized === "hybrid") {
      return "hybrid";
    }
    if (
      normalized === "onsite" ||
      normalized === "on-site" ||
      normalized === "office"
    ) {
      return "onsite";
    }
  }

  if (isRemote === false && !workplaceType) {
    // Explicit false without workplaceType still leaves room for hybrid/onsite
    // detection from location/description below.
  }

  const candidates = [location, description].filter(
    (value): value is string => Boolean(value),
  );

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (/\bremote\b/.test(normalized)) {
      return "remote";
    }
    if (/\bhybrid\b/.test(normalized)) {
      return "hybrid";
    }
    if (/\b(on-?site|in-?office|in-?person)\b/.test(normalized)) {
      return "onsite";
    }
  }

  if (isRemote === false) {
    return "onsite";
  }

  return null;
}

function parseEmploymentType(
  employmentType: string | null,
  title: string,
): EmploymentType | null {
  const mapped = mapEmploymentType(employmentType);
  if (mapped) {
    return mapped;
  }

  const lowerTitle = title.toLowerCase();
  if (/\b(intern(ship)?)\b/.test(lowerTitle)) {
    return "internship";
  }
  if (/\b(contract|contractor|ftc|fixed[-\s]?term)\b/.test(lowerTitle)) {
    return "contract";
  }
  if (/\b(part[-\s]?time)\b/.test(lowerTitle)) {
    return "part-time";
  }
  if (/\b(temporary|temp)\b/.test(lowerTitle)) {
    return "temporary";
  }
  if (/\b(full[-\s]?time)\b/.test(lowerTitle)) {
    return "full-time";
  }

  return null;
}

function mapEmploymentType(value: string | null): EmploymentType | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (
    normalized.includes("full time") ||
    normalized === "fulltime" ||
    normalized === "full time"
  ) {
    return "full-time";
  }
  if (normalized.includes("part time") || normalized === "parttime") {
    return "part-time";
  }
  if (normalized.includes("intern")) {
    return "internship";
  }
  if (normalized.includes("contract")) {
    return "contract";
  }
  if (normalized.includes("temporary") || normalized === "temp") {
    return "temporary";
  }

  return null;
}

function parseSalary(compensation: AshbyCompensation | null | undefined): {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
} {
  if (!compensation) {
    return { salaryMin: null, salaryMax: null, salaryCurrency: null };
  }

  const salaryComponents = (
    Array.isArray(compensation.summaryComponents)
      ? compensation.summaryComponents
      : []
  ).filter(
    (component): component is AshbyCompensationSummaryComponent =>
      Boolean(component) &&
      typeof component === "object" &&
      String(component.compensationType ?? "")
        .toLowerCase()
        .includes("salary"),
  );

  if (salaryComponents.length === 0) {
    return { salaryMin: null, salaryMax: null, salaryCurrency: null };
  }

  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  let salaryCurrency: string | null = null;

  for (const component of salaryComponents) {
    const min = normalizeNumber(component.minValue);
    const max = normalizeNumber(component.maxValue);
    const currency = normalizeText(component.currencyCode);

    if (min !== null) {
      salaryMin = salaryMin === null ? min : Math.min(salaryMin, min);
    }
    if (max !== null) {
      salaryMax = salaryMax === null ? max : Math.max(salaryMax, max);
    }
    if (!salaryCurrency && currency) {
      salaryCurrency = currency;
    }
  }

  return { salaryMin, salaryMax, salaryCurrency };
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parsePostedAt(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseVisaSponsorship(description: string): boolean | null {
  if (!description) {
    return null;
  }

  const lower = description.toLowerCase();
  if (
    /\b(no|not)\s+(?:offer|provide)\s+(?:visa|work authorization)\b/.test(
      lower,
    ) ||
    /\bno\s+visa\s+sponsorship(?:\s+available)?\b/.test(lower) ||
    /\bdoes\s+not\s+sponsor\s+visas?\b/.test(lower)
  ) {
    return false;
  }

  if (/\b(visa sponsorship|sponsor visas|work authorization)\b/.test(lower)) {
    return true;
  }

  return null;
}

function buildTags(
  raw: AshbyRawJobPayload,
  employmentType: EmploymentType | null,
  workMode: WorkMode | null,
): string[] {
  const tags: string[] = [];
  const candidates = [
    raw.department,
    raw.team,
    raw.location,
    employmentType,
    workMode,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized && !tags.includes(normalized)) {
      tags.push(normalized);
    }
  }

  return tags;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
