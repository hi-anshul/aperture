export type FetchErrorCode =
  | "TIMEOUT"
  | "NETWORK"
  | "HTTP_ERROR"
  | "RATE_LIMITED"
  | "BROWSER_ERROR"
  | "ABORTED";

export interface FetchErrorDetails {
  code: FetchErrorCode;
  message: string;
  url: string;
  companyId: string;
  status?: number;
  attempts: number;
  lastAttemptAt: string;
}

export class FetchError extends Error {
  readonly details: FetchErrorDetails;

  constructor(details: FetchErrorDetails) {
    super(details.message);
    this.name = "FetchError";
    this.details = details;
  }

  /** Serializes for `sync_history.error_message`. */
  toSyncHistoryMessage(): string {
    return JSON.stringify(this.details);
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof FetchError) {
    return false;
  }

  if (error instanceof Error) {
    const name = error.name;
    return (
      name === "AbortError" ||
      name === "TimeoutError" ||
      name.includes("Timeout") ||
      name === "TypeError"
    );
  }

  return false;
}

export function buildFetchError(params: {
  code: FetchErrorCode;
  message: string;
  url: string;
  companyId: string;
  status?: number;
  attempts: number;
}): FetchError {
  return new FetchError({
    ...params,
    lastAttemptAt: new Date().toISOString(),
  });
}
