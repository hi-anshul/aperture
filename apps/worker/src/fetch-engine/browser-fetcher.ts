import type { Browser } from "playwright";

import type { FetchEngineConfig } from "./config";
import { buildFetchError } from "./errors";
import type { FetchRequest, FetchSuccess } from "./types";
import type { SleepFn } from "./rate-limiter";

export interface BrowserPage {
  goto(
    url: string,
    options: { waitUntil: "networkidle"; timeout: number },
  ): Promise<unknown>;
  content(): Promise<string>;
  close(): Promise<void>;
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
}

export interface BrowserContext {
  newPage(): Promise<BrowserPage>;
  close(): Promise<void>;
}

export interface BrowserHandle {
  newContext(): Promise<BrowserContext>;
  close(): Promise<void>;
}

export interface BrowserFetcherDeps {
  launchBrowser?: () => Promise<BrowserHandle>;
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

let sharedBrowser: Browser | null = null;
let sharedBrowserLaunch: Promise<Browser> | null = null;

async function defaultLaunchBrowser(): Promise<BrowserHandle> {
  const { chromium } = await import("playwright");
  if (!sharedBrowser) {
    if (!sharedBrowserLaunch) {
      sharedBrowserLaunch = chromium.launch({ headless: true }).then((browser) => {
        sharedBrowser = browser;
        return browser;
      });
    }

    sharedBrowser = await sharedBrowserLaunch;
  }

  return sharedBrowser as unknown as BrowserHandle;
}

export async function closeSharedBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedBrowserLaunch = null;
  }
}

export async function fetchWithBrowser(
  request: FetchRequest,
  config: FetchEngineConfig,
  deps: BrowserFetcherDeps = {},
): Promise<FetchSuccess> {
  const launchBrowser = deps.launchBrowser ?? defaultLaunchBrowser;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const totalAttempts = config.maxRetries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    let context: BrowserContext | undefined;
    let page: BrowserPage | undefined;

    try {
      const browser = await launchBrowser();
      context = await browser.newContext();
      page = await context.newPage();
      await page.setExtraHTTPHeaders({
        "User-Agent": resolveUserAgent(request, config),
        ...request.headers,
      });

      const response = (await page.goto(request.url, {
        waitUntil: "networkidle",
        timeout: config.timeoutMs,
      })) as { status?: () => number } | null;

      const status = response?.status?.() ?? 200;
      const body = await page.content();

      return {
        ok: true,
        url: request.url,
        status,
        contentType: "text/html",
        body,
        fetchedAt: new Date(),
        mode: "browser",
      };
    } catch (error) {
      if (attempt < totalAttempts) {
        await sleep(computeBackoffMs(attempt, config));
        continue;
      }

      const message =
        error instanceof Error ? error.message : "Unknown browser error";

      throw buildFetchError({
        code: "BROWSER_ERROR",
        message: `${message} (${request.url})`,
        url: request.url,
        companyId: request.companyId,
        attempts: attempt,
      });
    } finally {
      await page?.close().catch(() => undefined);
      await context?.close().catch(() => undefined);
    }
  }

  throw buildFetchError({
    code: "BROWSER_ERROR",
    message: `Failed to render ${request.url} after ${totalAttempts} attempts`,
    url: request.url,
    companyId: request.companyId,
    attempts: totalAttempts,
  });
}
