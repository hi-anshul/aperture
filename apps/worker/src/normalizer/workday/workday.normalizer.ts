import { randomUUID } from "node:crypto";

import type {
  EmploymentType,
  NormalizedJob,
  RawJob,
  WorkMode,
} from "@aperture/shared";

import type { NormalizeContext } from "../types";
import type { WorkdayRawJobPayload } from "./types";

export function normalizeWorkdayJob(
  rawJob: RawJob,
  context: NormalizeContext,
): NormalizedJob {
  const raw = rawJob.raw as WorkdayRawJobPayload;
  const info = raw.jobPostingInfo;

  const title =
    normalizeText(info?.title) ??
    normalizeText(raw.title) ??
    "Untitled role";
  const description = normalizeText(info?.jobDescription) ?? "";
  const locationText =
    normalizeText(info?.location) ??
    normalizeText(info?.locationsText) ??
    normalizeText(raw.locationsText);
  const workMode = parseWorkMode(
    normalizeText(info?.remoteType),
    locationText,
    description,
  );
  const country = normalizeText(info?.country);
  const employmentType = parseEmploymentType(
    normalizeText(info?.timeType),
    title,
  );
  const postedAt = parsePostedAt(info?.startDate, raw.postedOn, info?.postedOn);
  const tags = buildTags(locationText, employmentType, workMode);
  const syncedAt = context.syncedAt ?? new Date();

  return {
    id: context.jobId ?? randomUUID(),
    externalId: rawJob.externalId,
    sourcePlatform: rawJob.sourcePlatform,
    sourceUrl: rawJob.sourceUrl,
    companyId: context.companyId,
    title,
    description,
    location: locationText,
    workMode,
    country,
    employmentType,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    visaSponsorship: parseVisaSponsorship(description),
    tags,
    postedAt,
    firstSeenAt: context.firstSeenAt ?? syncedAt,
    lastSeenAt: syncedAt,
    isActive: context.isActive ?? true,
  };
}

function parseWorkMode(
  remoteType: string | null,
  location: string | null,
  description: string,
): WorkMode | null {
  const candidates = [remoteType, location, description].filter(
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
  timeType: string | null,
  title: string,
): EmploymentType | null {
  const mapped = mapEmploymentType(timeType);
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

function parsePostedAt(
  startDate: unknown,
  listPostedOn: unknown,
  detailPostedOn: unknown,
): Date | null {
  return (
    parseDate(startDate) ??
    parseRelativePostedOn(detailPostedOn) ??
    parseRelativePostedOn(listPostedOn)
  );
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseRelativePostedOn(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "posted today") {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }

  const daysMatch = /^posted\s+(\d+)\s+days?\s+ago$/.exec(normalized);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - days);
    return date;
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
  location: string | null,
  employmentType: EmploymentType | null,
  workMode: WorkMode | null,
): string[] {
  const tags: string[] = [];
  if (location) {
    tags.push(location);
  }
  if (employmentType) {
    tags.push(employmentType);
  }
  if (workMode) {
    tags.push(workMode);
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
