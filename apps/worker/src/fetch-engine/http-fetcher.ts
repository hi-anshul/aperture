import type { FetchEngineConfig } from "./config";
import {
  FetchError,
  buildFetchError,
  isRetryableError,
  isRetryableStatus,
} from "./errors";
import type { FetchRequest, FetchSuccess } from "./types";
import type { SleepFn } from "./rate-limiter";

export type FetchFn = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface HttpFetcherDeps {
  fetchFn?: FetchFn;
  sleep?: SleepFn;
}

function resolveUserAgent(
  request: FetchRequest,
  config: FetchEngineConfig,
): string {
  return request.userAgent ?? config.defaultUserAgent;
}

function computeBackoffMs(attempt: number, config: FetchEngineConfig): number {
  const delay =
    config.initialBackoffMs * config.backoffMultiplier ** (attempt - 1);
  return Math.min(delay, config.maxBackoffMs);
}

export async function fetchHttp(
  request: FetchRequest,
  config: FetchEngineConfig,
  deps: HttpFetcherDeps = {},
): Promise<FetchSuccess> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const totalAttempts = config.maxRetries + 1;
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const response = await fetchFn(request.url, {
        method: "GET",
        headers: {
          Accept: "text/html,application/json,*/*",
          "User-Agent": resolveUserAgent(request, config),
          ...request.headers,
        },
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      lastStatus = response.status;

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < totalAttempts) {
          await sleep(computeBackoffMs(attempt, config));
          continue;
        }

        throw buildFetchError({
          code: response.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR",
          message: `HTTP ${response.status} fetching ${request.url}`,
          url: request.url,
          companyId: request.companyId,
          status: response.status,
          attempts: attempt,
        });
      }

      const contentType = response.headers.get("content-type") ?? "text/plain";
      const body = await response.text();

      return {
        ok: true,
        url: request.url,
        status: response.status,
        contentType,
        body,
        fetchedAt: new Date(),
        mode: "http",
      };
    } catch (error) {
      if (error instanceof FetchError) {
        throw error;
      }

      const timedOut =
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError");

      if (timedOut && attempt >= totalAttempts) {
        throw buildFetchError({
          code: "TIMEOUT",
          message: `Request timed out after ${config.timeoutMs}ms: ${request.url}`,
          url: request.url,
          companyId: request.companyId,
          status: lastStatus,
          attempts: attempt,
        });
      }

      if (isRetryableError(error) && attempt < totalAttempts) {
        await sleep(computeBackoffMs(attempt, config));
        continue;
      }

      const message =
        error instanceof Error ? error.message : "Unknown network error";

      throw buildFetchError({
        code: timedOut ? "TIMEOUT" : "NETWORK",
        message: `${message} (${request.url})`,
        url: request.url,
        companyId: request.companyId,
        status: lastStatus,
        attempts: attempt,
      });
    }
  }

  throw buildFetchError({
    code: "NETWORK",
    message: `Failed to fetch ${request.url} after ${totalAttempts} attempts`,
    url: request.url,
    companyId: request.companyId,
    status: lastStatus,
    attempts: totalAttempts,
  });
}
