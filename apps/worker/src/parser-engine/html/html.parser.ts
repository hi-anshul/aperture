import type { RawJob } from "@aperture/shared";
import { parseHtmlJobs } from "@aperture/connectors";

import { buildParserError } from "../errors";
import type { ParseRequest } from "../types";

export interface HtmlParseContext {
  sourceUrl?: string;
  companyId?: string;
  platform: "static-html" | "react-rendered";
}

/**
 * Parse static / browser-rendered careers HTML into RawJob[].
 */
export function parseHtmlContent(
  content: string,
  context: HtmlParseContext,
): RawJob[] {
  if (!context.sourceUrl) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message: "HTML parser requires sourceUrl as the careers page base URL",
      platform: context.platform,
      companyId: context.companyId,
    });
  }

  try {
    return parseHtmlJobs(content, {
      sourcePlatform: context.platform,
      baseUrl: context.sourceUrl,
    });
  } catch (error) {
    throw buildParserError({
      code: "INVALID_STRUCTURE",
      message:
        error instanceof Error
          ? error.message
          : "Failed to parse careers HTML",
      platform: context.platform,
      sourceUrl: context.sourceUrl,
      companyId: context.companyId,
    });
  }
}

export function parseStaticHtmlRequest(request: ParseRequest): RawJob[] {
  return parseHtmlContent(request.content, {
    platform: "static-html",
    sourceUrl: request.sourceUrl,
    companyId: request.companyId,
  });
}

export function parseReactRenderedRequest(request: ParseRequest): RawJob[] {
  return parseHtmlContent(request.content, {
    platform: "react-rendered",
    sourceUrl: request.sourceUrl,
    companyId: request.companyId,
  });
}
