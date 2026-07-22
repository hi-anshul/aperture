import type { RawJob } from "@aperture/shared";

import { buildParserError } from "../errors";
import type { ParseRequest } from "../types";
import type { LeverPosting, LeverPostingsResponse } from "./types";

export interface LeverParseContext {
  sourceUrl?: string;
  companyId?: string;
}

/**
 * Parse a Lever public postings JSON payload (array) into RawJob[].
 */
export function parseLeverContent(
  content: string,
  context: LeverParseContext = {},
): RawJob[] {
  const payload = parseJson(content, context);
  const postings = assertLeverPostingsResponse(payload, context);
  const jobs: RawJob[] = [];

  for (const posting of postings) {
    const rawJob = toRawJob(posting);
    if (rawJob) {
      jobs.push(rawJob);
    }
  }

  if (postings.length > 0 && jobs.length === 0) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message:
        "Lever response contained postings, but none had a usable id and hostedUrl",
      platform: "lever",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  return jobs;
}

export function parseLeverRequest(request: ParseRequest): RawJob[] {
  return parseLeverContent(request.content, {
    sourceUrl: request.sourceUrl,
    companyId: request.companyId,
  });
}

function parseJson(content: string, context: LeverParseContext): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw buildParserError({
      code: "INVALID_JSON",
      message: "Lever response is not valid JSON",
      platform: "lever",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }
}

function assertLeverPostingsResponse(
  payload: unknown,
  context: LeverParseContext,
): LeverPostingsResponse {
  if (!Array.isArray(payload)) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message: "Lever response must be a JSON array of postings",
      platform: "lever",
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }

  return payload as LeverPosting[];
}

function toRawJob(posting: unknown): RawJob | null {
  if (!posting || typeof posting !== "object") {
    return null;
  }

  const record = posting as Record<string, unknown>;
  const externalId = normalizeExternalId(record.id);
  const sourceUrl = normalizeSourceUrl(record.hostedUrl);

  if (!externalId || !sourceUrl) {
    return null;
  }

  return {
    sourcePlatform: "lever",
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
