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
  const country =
    normalizeText(info?.country) ?? deriveCountryFromLocation(locationText);
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

function deriveCountryFromLocation(location: string | null): string | null {
  if (!location) {
    return null;
  }

  const trimmed = location.trim();
  if (!trimmed) {
    return null;
  }

  const prefixMatch = /^([A-Z]{2})\s*[-–—]\s*/i.exec(trimmed);
  if (prefixMatch?.[1]) {
    const fromCode = countryFromIsoCode(prefixMatch[1]);
    if (fromCode) {
      return fromCode;
    }
  }

  const segments = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const lastSegment = segments.at(-1);
  if (!lastSegment) {
    return null;
  }

  const fromName = countryFromDisplayName(lastSegment);
  if (fromName) {
    return fromName;
  }

  return null;
}

const ISO_COUNTRY_CODES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  UK: "United Kingdom",
  IN: "India",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  IE: "Ireland",
  NL: "Netherlands",
  SG: "Singapore",
  JP: "Japan",
  BR: "Brazil",
  MX: "Mexico",
  ES: "Spain",
  IT: "Italy",
  SE: "Sweden",
  CH: "Switzerland",
  AE: "United Arab Emirates",
  NZ: "New Zealand",
  PL: "Poland",
  CZ: "Czech Republic",
  RO: "Romania",
  TW: "Taiwan",
  KR: "South Korea",
  CN: "China",
  HK: "Hong Kong",
  PH: "Philippines",
  MY: "Malaysia",
  ID: "Indonesia",
  TH: "Thailand",
  VN: "Vietnam",
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  EG: "Egypt",
  IL: "Israel",
  TR: "Turkey",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  PT: "Portugal",
  AT: "Austria",
  BE: "Belgium",
  DK: "Denmark",
  FI: "Finland",
  NO: "Norway",
  LU: "Luxembourg",
  CI: "Cote D'Ivoire",
};

const COUNTRY_DISPLAY_NAMES = new Map<string, string>(
  [
    "United States",
    "United States of America",
    "United Kingdom",
    "Great Britain",
    "India",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Ireland",
    "Netherlands",
    "Singapore",
    "Japan",
    "Brazil",
    "Mexico",
    "Spain",
    "Italy",
    "Sweden",
    "Switzerland",
    "United Arab Emirates",
    "New Zealand",
    "Poland",
    "Czech Republic",
    "Romania",
    "Taiwan",
    "South Korea",
    "China",
    "Hong Kong",
    "Philippines",
    "Malaysia",
    "Indonesia",
    "Thailand",
    "Vietnam",
    "South Africa",
    "Nigeria",
    "Kenya",
    "Egypt",
    "Israel",
    "Turkey",
    "Argentina",
    "Chile",
    "Colombia",
    "Peru",
    "Portugal",
    "Austria",
    "Belgium",
    "Denmark",
    "Finland",
    "Norway",
    "Luxembourg",
    "Cote D'Ivoire",
  ].map((name) => [name.toLowerCase(), name]),
);

function countryFromIsoCode(code: string): string | null {
  return ISO_COUNTRY_CODES[code.toUpperCase()] ?? null;
}

function countryFromDisplayName(value: string): string | null {
  return COUNTRY_DISPLAY_NAMES.get(value.trim().toLowerCase()) ?? null;
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
