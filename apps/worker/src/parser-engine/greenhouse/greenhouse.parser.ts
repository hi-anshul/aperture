import type { RawJob } from "@aperture/shared";

import { buildParserError } from "../errors";
import type { ParseRequest } from "../types";
import type { GreenhouseJob, GreenhouseJobsResponse } from "./types";

export interface GreenhouseParseContext {
  sourceUrl?: string;
  companyId?: string;
}

export function parseGreenhouseContent(
  content: string,
  context: GreenhouseParseContext = {},
): RawJob[] {
  const payload = parseJson(content, context);
  const response = assertGreenhouseJobsResponse(payload, context);

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
        "Greenhouse response contained jobs, but none had the required id and absolute_url fields",
      platform: "greenhouse",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  return jobs;
}

export function parseGreenhouseRequest(request: ParseRequest): RawJob[] {
  return parseGreenhouseContent(request.content, {
    sourceUrl: request.sourceUrl,
    companyId: request.companyId,
  });
}

function parseJson(
  content: string,
  context: GreenhouseParseContext,
): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw buildParserError({
      code: "INVALID_JSON",
      message: "Greenhouse response is not valid JSON",
      platform: "greenhouse",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }
}

function assertGreenhouseJobsResponse(
  payload: unknown,
  context: GreenhouseParseContext,
): GreenhouseJobsResponse {
  if (!payload || typeof payload !== "object") {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message: "Greenhouse response must be a JSON object with a jobs array",
      platform: "greenhouse",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  const jobs = (payload as { jobs?: unknown }).jobs;
  if (!Array.isArray(jobs)) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message: 'Greenhouse response must contain a "jobs" array',
      platform: "greenhouse",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  return { jobs: jobs as GreenhouseJob[] };
}

function toRawJob(job: unknown): RawJob | null {
  if (!job || typeof job !== "object") {
    return null;
  }

  const record = job as Record<string, unknown>;
  const externalId = normalizeExternalId(record.id);
  const sourceUrl = normalizeSourceUrl(record.absolute_url);

  if (!externalId || !sourceUrl) {
    return null;
  }

  return {
    sourcePlatform: "greenhouse",
    sourceUrl,
    externalId,
    raw: record,
  };
}

function normalizeExternalId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function normalizeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}
