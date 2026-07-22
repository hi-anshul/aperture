import type { RawJob } from "@aperture/shared";

import { buildParserError } from "./errors";
import { parseAshbyRequest } from "./ashby/ashby.parser";
import { parseGreenhouseRequest } from "./greenhouse/greenhouse.parser";
import {
  parseReactRenderedRequest,
  parseStaticHtmlRequest,
} from "./html/html.parser";
import { parseLeverRequest } from "./lever/lever.parser";
import { parseWorkdayRequest } from "./workday/workday.parser";
import type { ParseRequest, ParseSuccess } from "./types";

export class ParserEngine {
  parse(request: ParseRequest): RawJob[] {
    switch (request.platform) {
      case "greenhouse":
        return parseGreenhouseRequest(request);
      case "lever":
        return parseLeverRequest(request);
      case "ashby":
        return parseAshbyRequest(request);
      case "workday":
        return parseWorkdayRequest(request);
      case "static-html":
        return parseStaticHtmlRequest(request);
      case "react-rendered":
        return parseReactRenderedRequest(request);
      default:
        throw buildParserError({
          code: "UNSUPPORTED_PLATFORM",
          message: `No parser registered for platform "${request.platform}"`,
          platform: request.platform,
          sourceUrl: request.sourceUrl,
          companyId: request.companyId,
        });
    }
  }

  parseWithMetadata(request: ParseRequest): ParseSuccess {
    return {
      platform: request.platform,
      jobs: this.parse(request),
    };
  }
}

export function createParserEngine(): ParserEngine {
  return new ParserEngine();
}
