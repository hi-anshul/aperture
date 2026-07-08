import type { PlatformType } from "@aperture/shared";

export type ParserErrorCode =
  | "INVALID_JSON"
  | "INVALID_STRUCTURE"
  | "UNSUPPORTED_PLATFORM";

export interface ParserErrorDetails {
  code: ParserErrorCode;
  message: string;
  platform: PlatformType;
  sourceUrl?: string;
  companyId?: string;
}

export class ParserError extends Error {
  readonly details: ParserErrorDetails;

  constructor(details: ParserErrorDetails) {
    super(details.message);
    this.name = "ParserError";
    this.details = details;
  }

  /** Serializes for `sync_history.error_message`. */
  toSyncHistoryMessage(): string {
    return JSON.stringify(this.details);
  }
}

export function buildParserError(
  details: ParserErrorDetails,
): ParserError {
  return new ParserError(details);
}
