import type { BrowserFetcherDeps } from "./browser-fetcher";
import { fetchWithBrowser } from "./browser-fetcher";
import {
  DEFAULT_FETCH_CONFIG,
  getFetchEngineConfig,
  type FetchEngineConfig,
} from "./config";
import type { HttpFetcherDeps } from "./http-fetcher";
import { fetchHttp } from "./http-fetcher";
import { CompanyRateLimiter } from "./rate-limiter";
import type { FetchRequest, FetchSuccess } from "./types";

export interface FetchEngineDeps {
  http?: HttpFetcherDeps;
  browser?: BrowserFetcherDeps;
}

export class FetchEngine {
  private readonly config: FetchEngineConfig;
  private readonly rateLimiter: CompanyRateLimiter;
  private readonly deps: FetchEngineDeps;

  constructor(
    config: Partial<FetchEngineConfig> = {},
    deps: FetchEngineDeps = {},
  ) {
    this.config = getFetchEngineConfig(config);
    this.rateLimiter = new CompanyRateLimiter(
      this.config.rateLimitIntervalMs,
      deps.http?.sleep ?? deps.browser?.sleep,
    );
    this.deps = deps;
  }

  getConfig(): FetchEngineConfig {
    return { ...this.config };
  }

  async fetch(request: FetchRequest): Promise<FetchSuccess> {
    await this.rateLimiter.waitForSlot(request.companyId);

    const mode = request.mode ?? "http";

    if (mode === "browser") {
      return fetchWithBrowser(request, this.config, this.deps.browser);
    }

    return fetchHttp(request, this.config, this.deps.http);
  }
}

export {
  DEFAULT_FETCH_CONFIG,
  getFetchEngineConfig,
  type FetchEngineConfig,
} from "./config";
export { FetchError, buildFetchError, type FetchErrorDetails } from "./errors";
export { fetchHttp, type HttpFetcherDeps } from "./http-fetcher";
export {
  fetchWithBrowser,
  closeSharedBrowser,
  type BrowserFetcherDeps,
} from "./browser-fetcher";
export { CompanyRateLimiter } from "./rate-limiter";
export type { FetchRequest, FetchSuccess, FetchMode } from "./types";

export function createFetchEngine(
  config: Partial<FetchEngineConfig> = {},
  deps: FetchEngineDeps = {},
): FetchEngine {
  return new FetchEngine(config, deps);
}
