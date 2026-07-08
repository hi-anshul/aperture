import type { RawJob } from "@aperture/shared";

import { buildParserError } from "./errors";
import { parseGreenhouseRequest } from "./greenhouse/greenhouse.parser";
import type { ParseRequest, ParseSuccess } from "./types";

export class ParserEngine {
  parse(request: ParseRequest): RawJob[] {
    switch (request.platform) {
      case "greenhouse":
        return parseGreenhouseRequest(request);
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
