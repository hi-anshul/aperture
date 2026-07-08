import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FetchEngine,
  FetchError,
  fetchHttp,
  fetchWithBrowser,
  CompanyRateLimiter,
  type BrowserFetcherDeps,
  type HttpFetcherDeps,
} from "./index";

const testConfig = {
  timeoutMs: 5_000,
  maxRetries: 2,
  initialBackoffMs: 100,
  maxBackoffMs: 500,
  backoffMultiplier: 2,
  rateLimitIntervalMs: 1_000,
  defaultUserAgent: "Aperture-Test/1.0",
};

const baseRequest = {
  url: "https://example.com/careers",
  companyId: "company-1",
};

function mockResponse(
  status: number,
  body: string,
  contentType = "text/html",
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? contentType : null,
    },
    text: async () => body,
  } as Response;
}

describe("fetchHttp retries and structured errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries with backoff before giving up and surfaces a structured error", async () => {
    const sleep = vi.fn(async () => undefined);
    let calls = 0;
    const fetchFn: HttpFetcherDeps["fetchFn"] = async () => {
      calls += 1;
      if (calls < 3) {
        return mockResponse(503, "unavailable");
      }
      return mockResponse(200, "<html>ok</html>");
    };

    const success = await fetchHttp(baseRequest, testConfig, { fetchFn, sleep });

    expect(success.body).toBe("<html>ok</html>");
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it("throws FetchError with sync_history-ready details after exhausting retries", async () => {
    const sleep = vi.fn(async () => undefined);
    const fetchFn: HttpFetcherDeps["fetchFn"] = async () =>
      mockResponse(500, "server error");

    await expect(
      fetchHttp(baseRequest, { ...testConfig, maxRetries: 2 }, { fetchFn, sleep }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(FetchError);
      const fetchError = error as FetchError;
      expect(fetchError.details).toMatchObject({
        code: "HTTP_ERROR",
        url: baseRequest.url,
        companyId: baseRequest.companyId,
        status: 500,
        attempts: 3,
      });
      expect(fetchError.toSyncHistoryMessage()).toBe(
        JSON.stringify(fetchError.details),
      );
      return true;
    });

    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

describe("fetchWithBrowser", () => {
  it("returns fully-rendered HTML from the Playwright path", async () => {
    const renderedHtml =
      "<html><body><div id=\"app\">Rendered by React</div></body></html>";

    const page = {
      goto: vi.fn(async () => ({ status: () => 200 })),
      content: vi.fn(async () => renderedHtml),
      close: vi.fn(async () => undefined),
      setExtraHTTPHeaders: vi.fn(async () => undefined),
    };

    const context = {
      newPage: vi.fn(async () => page),
      close: vi.fn(async () => undefined),
    };

    const browser = {
      newContext: vi.fn(async () => context),
      close: vi.fn(async () => undefined),
    };

    const deps: BrowserFetcherDeps = {
      launchBrowser: async () => browser,
      sleep: async () => undefined,
    };

    const result = await fetchWithBrowser(
      { ...baseRequest, mode: "browser" },
      testConfig,
      deps,
    );

    expect(result.mode).toBe("browser");
    expect(result.body).toBe(renderedHtml);
    expect(result.body).toContain("Rendered by React");
    expect(page.goto).toHaveBeenCalledWith(baseRequest.url, {
      waitUntil: "networkidle",
      timeout: testConfig.timeoutMs,
    });
  });
});

describe("CompanyRateLimiter", () => {
  it("enforces per-company intervals between rapid fetches", async () => {
    let now = 0;
    const sleep = vi.fn(async (ms: number) => {
      now += ms;
    });

    const limiter = new CompanyRateLimiter(
      1_000,
      sleep,
      () => now,
    );

    await limiter.waitForSlot("company-1");
    expect(sleep).not.toHaveBeenCalled();

    await limiter.waitForSlot("company-1");
    expect(sleep).toHaveBeenCalledWith(1_000);

    await limiter.waitForSlot("company-2");
    expect(sleep).toHaveBeenCalledTimes(1);
  });
});

describe("FetchEngine", () => {
  it("routes browser mode and applies rate limiting through the orchestrator", async () => {
    let now = 0;
    const sleep = vi.fn(async (ms: number) => {
      now += ms;
    });

    const fetchFn: HttpFetcherDeps["fetchFn"] = async () =>
      mockResponse(200, "<html>static</html>");

    const engine = new FetchEngine(testConfig, {
      http: { fetchFn, sleep },
    });

    await engine.fetch(baseRequest);
    await engine.fetch(baseRequest);

    expect(sleep).toHaveBeenCalledWith(testConfig.rateLimitIntervalMs);
  });

  it("contains no parsing logic — body is returned as a raw string", async () => {
    const jsonBody = '{"jobs":[{"id":1}]}';
    const fetchFn: HttpFetcherDeps["fetchFn"] = async () =>
      mockResponse(200, jsonBody, "application/json");

    const engine = new FetchEngine(testConfig, { http: { fetchFn } });
    const result = await engine.fetch(baseRequest);

    expect(typeof result.body).toBe("string");
    expect(result.body).toBe(jsonBody);
  });
});
