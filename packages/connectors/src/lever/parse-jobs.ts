import type { RawJob } from "@aperture/shared";

import type { LeverPosting, LeverPostingsResponse } from "./types";

export function parseLeverPostings(
  postings: LeverPostingsResponse,
): RawJob[] {
  const jobs: RawJob[] = [];

  for (const posting of postings) {
    const rawJob = toLeverRawJob(posting);
    if (rawJob) {
      jobs.push(rawJob);
    }
  }

  return jobs;
}

export function toLeverRawJob(posting: LeverPosting): RawJob | null {
  const externalId = normalizeExternalId(posting.id);
  const sourceUrl = normalizeSourceUrl(posting.hostedUrl);

  if (!externalId || !sourceUrl) {
    return null;
  }

  return {
    sourcePlatform: "lever",
    sourceUrl,
    externalId,
    raw: posting as Record<string, unknown>,
  };
}

function normalizeExternalId(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function normalizeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}
