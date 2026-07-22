import { randomUUID } from "node:crypto";

import type {
  EmploymentType,
  NormalizedJob,
  RawJob,
  WorkMode,
} from "@aperture/shared";

import type { NormalizeContext } from "../types";
import type { LeverRawJobPayload, LeverSalaryRange } from "./types";

export function normalizeLeverJob(
  rawJob: RawJob,
  context: NormalizeContext,
): NormalizedJob {
  const raw = rawJob.raw as LeverRawJobPayload;
  const categories = raw.categories ?? {};

  const title = normalizeText(raw.text) ?? "Untitled role";
  const description = buildDescription(raw);
  const location = resolveLocation(categories);
  const workMode = parseWorkMode(
    normalizeText(raw.workplaceType),
    location,
    description,
  );
  const country = normalizeText(raw.country);
  const employmentType = parseEmploymentType(
    normalizeText(categories.commitment),
    title,
  );
  const salary = parseSalary(raw.salaryRange);
  const tags = buildTags(categories, employmentType, workMode);
  const postedAt = parsePostedAt(raw.createdAt);
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

function buildDescription(raw: LeverRawJobPayload): string {
  const primary =
    normalizeText(raw.descriptionPlain) ?? normalizeText(raw.description);
  const parts: string[] = [];

  if (primary) {
    parts.push(primary);
  }

  if (Array.isArray(raw.lists)) {
    for (const list of raw.lists) {
      const heading = normalizeText(list.text);
      const content = normalizeText(list.content);
      if (!heading && !content) {
        continue;
      }
      parts.push([heading, content].filter(Boolean).join("\n"));
    }
  }

  const additional =
    normalizeText(raw.additionalPlain) ?? normalizeText(raw.additional);
  if (additional) {
    parts.push(additional);
  }

  return parts.join("\n\n");
}

function resolveLocation(
  categories: LeverRawJobPayload["categories"],
): string | null {
  if (!categories) {
    return null;
  }

  const primary = normalizeText(categories.location);
  if (primary) {
    return primary;
  }

  if (Array.isArray(categories.allLocations)) {
    for (const location of categories.allLocations) {
      const normalized = normalizeText(location);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function parseWorkMode(
  workplaceType: string | null,
  location: string | null,
  description: string,
): WorkMode | null {
  if (workplaceType) {
    const normalized = workplaceType.toLowerCase().replace(/_/g, "-");
    if (normalized === "remote") {
      return "remote";
    }
    if (normalized === "hybrid") {
      return "hybrid";
    }
    if (normalized === "on-site" || normalized === "onsite") {
      return "onsite";
    }
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

  return null;
}

function parseEmploymentType(
  commitment: string | null,
  title: string,
): EmploymentType | null {
  const mapped = mapEmploymentType(commitment);
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
  if (normalized.includes("full time") || normalized === "fulltime") {
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

function parseSalary(range: LeverSalaryRange | null | undefined): {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
} {
  if (!range || typeof range !== "object") {
    return { salaryMin: null, salaryMax: null, salaryCurrency: null };
  }

  return {
    salaryMin: normalizeNumber(range.min),
    salaryMax: normalizeNumber(range.max),
    salaryCurrency: normalizeText(range.currency),
  };
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
  if (typeof value === "number" && Number.isFinite(value)) {
    // Lever timestamps are usually epoch milliseconds.
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      return parsePostedAt(asNumber);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
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
  categories: LeverRawJobPayload["categories"],
  employmentType: EmploymentType | null,
  workMode: WorkMode | null,
): string[] {
  const tags: string[] = [];
  const candidates = [
    categories?.team,
    categories?.department,
    categories?.location,
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
