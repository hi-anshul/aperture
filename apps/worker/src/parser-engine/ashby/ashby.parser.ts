import type { RawJob } from "@aperture/shared";

import { buildParserError } from "../errors";
import type { ParseRequest } from "../types";
import type { AshbyJob, AshbyJobsResponse } from "./types";

export interface AshbyParseContext {
  sourceUrl?: string;
  companyId?: string;
}

/**
 * Parse an Ashby public job-board JSON payload into RawJob[].
 */
export function parseAshbyContent(
  content: string,
  context: AshbyParseContext = {},
): RawJob[] {
  const payload = parseJson(content, context);
  const response = assertAshbyJobsResponse(payload, context);
  const jobs: RawJob[] = [];

  for (const job of response.jobs) {
    const rawJob = toRawJob(job);
    if (rawJob) {
      jobs.push(rawJob);
    }
  }

  if (response.jobs.length > 0 && jobs.length === 0) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message:
        "Ashby response contained jobs, but none had a usable id and jobUrl",
      platform: "ashby",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  return jobs;
}

export function parseAshbyRequest(request: ParseRequest): RawJob[] {
  return parseAshbyContent(request.content, {
    sourceUrl: request.sourceUrl,
    companyId: request.companyId,
  });
}

function parseJson(content: string, context: AshbyParseContext): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw buildParserError({
      code: "INVALID_JSON",
      message: "Ashby response is not valid JSON",
      platform: "ashby",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }
}

function assertAshbyJobsResponse(
  payload: unknown,
  context: AshbyParseContext,
): { jobs: AshbyJob[] } {
  if (!payload || typeof payload !== "object") {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message: "Ashby response must be a JSON object with a jobs array",
      platform: "ashby",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  const jobs = (payload as AshbyJobsResponse).jobs;
  if (!Array.isArray(jobs)) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message: 'Ashby response must contain a "jobs" array',
      platform: "ashby",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  return { jobs };
}

function toRawJob(job: unknown): RawJob | null {
  if (!job || typeof job !== "object") {
    return null;
  }

  const record = job as Record<string, unknown>;
  const externalId = normalizeExternalId(record.id);
  const sourceUrl = normalizeSourceUrl(record.jobUrl);

  if (!externalId || !sourceUrl) {
    return null;
  }

  return {
    sourcePlatform: "ashby",
    sourceUrl,
    externalId,
    raw: record,
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
