import { randomUUID } from "node:crypto";

import type { NormalizedJob, RawJob } from "@aperture/shared";

import type { NormalizeContext } from "../types";
import { parseGreenhouseEmploymentType } from "./parse-employment-type";
import { parseGreenhouseLocation } from "./parse-location";
import { parseGreenhouseSalary } from "./parse-salary";
import { parseGreenhouseTags } from "./parse-tags";
import type {
  GreenhouseDepartment,
  GreenhouseMetadataField,
  GreenhouseOffice,
  GreenhouseRawJob,
} from "./types";

export function normalizeGreenhouseJob(
  rawJob: RawJob,
  context: NormalizeContext,
): NormalizedJob {
  const raw = rawJob.raw as GreenhouseRawJob;
  const metadata = normalizeMetadata(raw.metadata);
  const departments = normalizeDepartments(raw.departments);
  const offices = normalizeOffices(raw.offices);

  const title = normalizeRequiredText(raw.title) ?? "Untitled role";
  const description = normalizeText(raw.content) ?? "";
  const locationName = normalizeText(raw.location?.name);
  const { location, workMode, country } = parseGreenhouseLocation(
    locationName,
    offices,
    metadata,
  );
  const employmentType = parseGreenhouseEmploymentType(title, metadata);
  const salary = parseGreenhouseSalary(metadata, description);
  const tags = parseGreenhouseTags(departments, offices, metadata);
  const postedAt = parsePostedAt(raw.first_published, raw.updated_at);
  const visaSponsorship = parseVisaSponsorship(metadata, description);
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
    visaSponsorship,
    tags,
    postedAt,
    firstSeenAt: context.firstSeenAt ?? syncedAt,
    lastSeenAt: syncedAt,
    isActive: context.isActive ?? true,
  };
}

function parseVisaSponsorship(
  metadata: GreenhouseMetadataField[],
  description: string | null,
): boolean | null {
  for (const field of metadata) {
    const fieldName = normalizeText(field.name)?.toLowerCase() ?? "";
    if (
      !fieldName.includes("visa") &&
      !fieldName.includes("sponsorship") &&
      !fieldName.includes("work authorization")
    ) {
      continue;
    }

    const parsed = parseBooleanish(field.value);
    if (parsed !== null) {
      return parsed;
    }
  }

  if (!description) {
    return null;
  }

  const lowerDescription = description.toLowerCase();
  if (
    /\b(no|not)\s+(?:offer|provide)\s+(?:visa|work authorization)\b/.test(
      lowerDescription,
    ) ||
    /\bno\s+visa\s+sponsorship(?:\s+available)?\b/.test(lowerDescription) ||
    /\bdoes\s+not\s+sponsor\s+visas?\b/.test(lowerDescription) ||
    /\b(?:must|required\s+to)\s+already\s+have\s+work\s+authorization\b/.test(
      lowerDescription,
    )
  ) {
    return false;
  }

  if (/\b(visa sponsorship|sponsor visas|work authorization)\b/.test(lowerDescription)) {
    return true;
  }

  return null;
}

function parseBooleanish(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "available", "provided"].includes(normalized)) {
    return true;
  }

  if (["no", "false", "not available", "unavailable"].includes(normalized)) {
    return false;
  }

  return null;
}

function parsePostedAt(
  firstPublished: unknown,
  updatedAt: unknown,
): Date | null {
  return parseDate(firstPublished) ?? parseDate(updatedAt);
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeMetadata(
  metadata: GreenhouseMetadataField[] | null | undefined,
): GreenhouseMetadataField[] {
  return Array.isArray(metadata) ? metadata : [];
}

function normalizeDepartments(
  departments: GreenhouseDepartment[] | undefined,
): GreenhouseDepartment[] {
  return Array.isArray(departments) ? departments : [];
}

function normalizeOffices(
  offices: GreenhouseOffice[] | undefined,
): GreenhouseOffice[] {
  return Array.isArray(offices) ? offices : [];
}

function normalizeRequiredText(value: unknown): string | null {
  return normalizeText(value);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
