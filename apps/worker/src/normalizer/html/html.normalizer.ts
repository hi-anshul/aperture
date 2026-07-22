import { randomUUID } from "node:crypto";

import type {
  EmploymentType,
  NormalizedJob,
  RawJob,
  WorkMode,
} from "@aperture/shared";

import type { NormalizeContext } from "../types";
import type { StaticHtmlRawJobPayload } from "./types";

/**
 * Normalizes listings produced by the shared static-html / react-rendered parser.
 */
export function normalizeHtmlJob(
  rawJob: RawJob,
  context: NormalizeContext,
): NormalizedJob {
  const raw = rawJob.raw as StaticHtmlRawJobPayload;

  const title = normalizeText(raw.title) ?? "Untitled role";
  const description = stripHtml(normalizeText(raw.description) ?? "");
  const location = normalizeText(raw.location);
  const workMode = parseWorkMode(location, description);
  const employmentType = parseEmploymentType(title, description);
  const tags = buildTags(location, employmentType, workMode);
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
    country: null,
    employmentType,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    visaSponsorship: parseVisaSponsorship(description),
    tags,
    postedAt: null,
    firstSeenAt: context.firstSeenAt ?? syncedAt,
    lastSeenAt: syncedAt,
    isActive: context.isActive ?? true,
  };
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseWorkMode(
  location: string | null,
  description: string,
): WorkMode | null {
  const haystack = `${location ?? ""} ${description}`.toLowerCase();
  if (/\bremote\b/.test(haystack)) {
    return "remote";
  }
  if (/\bhybrid\b/.test(haystack)) {
    return "hybrid";
  }
  if (/\b(on[\s-]?site|in[\s-]?office)\b/.test(haystack)) {
    return "onsite";
  }
  return null;
}

function parseEmploymentType(
  title: string,
  description: string,
): EmploymentType | null {
  const haystack = `${title} ${description}`.toLowerCase();
  if (/\bintern(ship)?\b/.test(haystack)) {
    return "internship";
  }
  if (/\bcontract\b/.test(haystack)) {
    return "contract";
  }
  if (/\bpart[\s-]?time\b/.test(haystack)) {
    return "part-time";
  }
  if (/\btemporary\b|\btemp\b/.test(haystack)) {
    return "temporary";
  }
  if (/\bfull[\s-]?time\b/.test(haystack)) {
    return "full-time";
  }
  return null;
}

function parseVisaSponsorship(description: string): boolean | null {
  const lower = description.toLowerCase();
  if (
    /\b(visa sponsorship|sponsor(s|ship)? (a |an |the )?visa|h-?1b)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (
    /\b(no visa sponsorship|not sponsor|cannot sponsor|unable to sponsor)\b/.test(
      lower,
    )
  ) {
    return false;
  }
  return null;
}

function buildTags(
  location: string | null,
  employmentType: EmploymentType | null,
  workMode: WorkMode | null,
): string[] {
  const tags: string[] = [];
  if (workMode) {
    tags.push(workMode);
  }
  if (employmentType) {
    tags.push(employmentType);
  }
  if (location) {
    tags.push(location);
  }
  return tags;
}
