import type { RawJob } from "@aperture/shared";

import { buildParserError } from "../errors";
import type { ParseRequest } from "../types";
import type {
  WorkdayJobPosting,
  WorkdayJobsListResponse,
  WorkdayRawJobPayload,
} from "./types";

export interface WorkdayParseContext {
  sourceUrl?: string;
  companyId?: string;
}

/**
 * Parse a Workday CXS list JSON payload into RawJob[].
 * Detail enrichment is optional — when only list fields are present,
 * externalId/sourceUrl are derived from bulletFields / externalPath.
 */
export function parseWorkdayContent(
  content: string,
  context: WorkdayParseContext = {},
): RawJob[] {
  const payload = parseJson(content, context);
  const response = assertWorkdayJobsResponse(payload, context);
  const jobs: RawJob[] = [];

  for (const posting of response.jobPostings) {
    const rawJob = toRawJob(posting, context.sourceUrl);
    if (rawJob) {
      jobs.push(rawJob);
    }
  }

  if (response.jobPostings.length > 0 && jobs.length === 0) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message:
        "Workday response contained jobPostings, but none had a usable id and source URL",
      platform: "workday",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  return jobs;
}

export function parseWorkdayRequest(request: ParseRequest): RawJob[] {
  return parseWorkdayContent(request.content, {
    sourceUrl: request.sourceUrl,
    companyId: request.companyId,
  });
}

function parseJson(
  content: string,
  context: WorkdayParseContext,
): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw buildParserError({
      code: "INVALID_JSON",
      message: "Workday response is not valid JSON",
      platform: "workday",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }
}

function assertWorkdayJobsResponse(
  payload: unknown,
  context: WorkdayParseContext,
): { jobPostings: WorkdayJobPosting[] } {
  if (!payload || typeof payload !== "object") {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message:
        "Workday response must be a JSON object with a jobPostings array",
      platform: "workday",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  const jobPostings = (payload as WorkdayJobsListResponse).jobPostings;
  if (!Array.isArray(jobPostings)) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message: 'Workday response must contain a "jobPostings" array',
      platform: "workday",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  return { jobPostings };
}

function toRawJob(
  posting: WorkdayJobPosting,
  boardSourceUrl?: string,
): RawJob | null {
  const externalId = resolveExternalId(posting);
  const sourceUrl = resolveSourceUrl(posting, boardSourceUrl);

  if (!externalId || !sourceUrl) {
    return null;
  }

  const raw: WorkdayRawJobPayload = { ...posting };

  return {
    sourcePlatform: "workday",
    sourceUrl,
    externalId,
    raw: raw as Record<string, unknown>,
  };
}

function resolveExternalId(posting: WorkdayJobPosting): string | null {
  const bullet = posting.bulletFields?.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (bullet) {
    return bullet.trim();
  }

  if (typeof posting.externalPath === "string" && posting.externalPath.trim()) {
    return posting.externalPath.split("/").filter(Boolean).at(-1) ?? null;
  }

  return null;
}

function resolveSourceUrl(
  posting: WorkdayJobPosting,
  boardSourceUrl?: string,
): string | null {
  if (typeof posting.externalPath !== "string" || !posting.externalPath.trim()) {
    return null;
  }

  if (!boardSourceUrl) {
    return posting.externalPath.trim();
  }

  try {
    const board = new URL(boardSourceUrl);
    const site = board.pathname.split("/").filter(Boolean).at(-1) ?? "";
    const path = posting.externalPath.startsWith("/")
      ? posting.externalPath
      : `/${posting.externalPath}`;
    return site
      ? `${board.origin}/${site}${path}`
      : `${board.origin}${path}`;
  } catch {
    return posting.externalPath.trim();
  }
}
