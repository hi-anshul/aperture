import type { RawJob } from "@aperture/shared";

import type { AshbyJob, AshbyJobsResponse } from "./types";

export function parseAshbyJobs(response: AshbyJobsResponse): RawJob[] {
  const jobs = Array.isArray(response.jobs) ? response.jobs : [];
  const parsed: RawJob[] = [];

  for (const job of jobs) {
    const rawJob = toAshbyRawJob(job);
    if (rawJob) {
      parsed.push(rawJob);
    }
  }

  return parsed;
}

export function toAshbyRawJob(job: AshbyJob): RawJob | null {
  const externalId = normalizeExternalId(job.id);
  const sourceUrl = normalizeSourceUrl(job.jobUrl);

  if (!externalId || !sourceUrl) {
    return null;
  }

  return {
    sourcePlatform: "ashby",
    sourceUrl,
    externalId,
    raw: job as Record<string, unknown>,
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
