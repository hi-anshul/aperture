import type { Company, RawJob } from "@aperture/shared";
import { Agent, fetch as undiciFetch } from "undici";

import type { Connector } from "../connector";
import {
  extractWorkdayBoard,
  extractWorkdayBoardFromHtml,
  isWorkdayCareersUrl,
} from "./extract-board";
import {
  buildWorkdayJobDetailUrl,
  buildWorkdayJobsListUrl,
  parseWorkdayJobPostings,
} from "./parse-jobs";
import type {
  WorkdayBoard,
  WorkdayJobDetailResponse,
  WorkdayJobPosting,
  WorkdayJobsListResponse,
} from "./types";

const WORKDAY_FETCH_TIMEOUT_MS = 30_000;
const WORKDAY_PAGE_SIZE = 20;
/** Keep low — large CXS detail bodies + high concurrency trip undici backpressure crashes on Node 24. */
const WORKDAY_DETAIL_CONCURRENCY = 2;
const WORKDAY_DETAIL_BATCH_GAP_MS = 50;
const DEFAULT_USER_AGENT = "Aperture/1.0";

/**
 * Dedicated agent for Workday CXS calls.
 * Userland undici ≥8.4.1 avoids Node 24's bundled undici AssertionError when a
 * peer closes the socket while a large response body is paused under backpressure.
 */
const workdayAgent = new Agent({
  connections: WORKDAY_DETAIL_CONCURRENCY,
  pipelining: 0,
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 15_000,
});

export type FetchFn = typeof fetch;

const defaultWorkdayFetch: FetchFn = ((input, init) =>
  undiciFetch(input as string | URL, {
    ...(init as Parameters<typeof undiciFetch>[1]),
    dispatcher: workdayAgent,
  })) as FetchFn;

export class WorkdayConnector implements Connector {
  readonly platform = "workday";

  constructor(private readonly fetchFn: FetchFn = defaultWorkdayFetch) {}
  canHandle(careersUrl: string): boolean {
    return isWorkdayCareersUrl(careersUrl);
  }

  async fetch(company: Company): Promise<RawJob[]> {
    const board = await this.resolveBoard(company.careersUrl);
    if (!board) {
      throw new Error(
        `Could not extract Workday board from careers URL: ${company.careersUrl}`,
      );
    }

    const postings = await this.fetchAllPostings(board);
    const detailsByPath = await this.fetchJobDetails(board, postings);
    return parseWorkdayJobPostings(board, postings, detailsByPath);
  }

  private async resolveBoard(careersUrl: string): Promise<WorkdayBoard | null> {
    const fromUrl = extractWorkdayBoard(careersUrl);
    if (fromUrl) {
      return fromUrl;
    }

    const html = await this.fetchText(careersUrl, {
      Accept: "text/html,application/xhtml+xml",
    });
    return extractWorkdayBoardFromHtml(html);
  }

  private async fetchAllPostings(
    board: WorkdayBoard,
  ): Promise<WorkdayJobPosting[]> {
    const listUrl = buildWorkdayJobsListUrl(board);
    const all: WorkdayJobPosting[] = [];
    let offset = 0;
    let total: number | null = null;

    while (total === null || offset < total) {
      const payload = await this.postJson<WorkdayJobsListResponse>(listUrl, {
        appliedFacets: {},
        limit: WORKDAY_PAGE_SIZE,
        offset,
        searchText: "",
      }, board);

      const page = Array.isArray(payload.jobPostings) ? payload.jobPostings : [];
      if (page.length === 0) {
        break;
      }

      all.push(...page);

      // Workday often returns total only on the first page (later pages send 0).
      if (
        total === null &&
        typeof payload.total === "number" &&
        Number.isFinite(payload.total) &&
        payload.total > 0
      ) {
        total = payload.total;
      }

      offset += WORKDAY_PAGE_SIZE;

      if (total !== null && all.length >= total) {
        break;
      }

      // No reliable total — stop when a short page arrives.
      if (total === null && page.length < WORKDAY_PAGE_SIZE) {
        break;
      }
    }

    return all;
  }

  private async fetchJobDetails(
    board: WorkdayBoard,
    postings: WorkdayJobPosting[],
  ): Promise<Map<string, WorkdayJobDetailResponse>> {
    const details = new Map<string, WorkdayJobDetailResponse>();
    const paths = postings
      .map((posting) =>
        typeof posting.externalPath === "string" ? posting.externalPath : null,
      )
      .filter((path): path is string => Boolean(path));

    for (let i = 0; i < paths.length; i += WORKDAY_DETAIL_CONCURRENCY) {
      if (i > 0) {
        await sleep(WORKDAY_DETAIL_BATCH_GAP_MS);
      }

      const batch = paths.slice(i, i + WORKDAY_DETAIL_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (externalPath) => {
          try {
            const detail = await this.getJson<WorkdayJobDetailResponse>(
              buildWorkdayJobDetailUrl(board, externalPath),
              board,
            );
            return { externalPath, detail };
          } catch {
            return null;
          }
        }),
      );

      for (const result of results) {
        if (result) {
          details.set(result.externalPath, result.detail);
        }
      }
    }

    return details;
  }

  private async postJson<T>(
    url: string,
    body: Record<string, unknown>,
    board: WorkdayBoard,
  ): Promise<T> {
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Language": "en-US",
        "User-Agent": DEFAULT_USER_AGENT,
        Referer: `${board.origin}/${board.site}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await drainResponseBody(response);
      throw new Error(
        `Workday CXS list request failed (${response.status}) for site "${board.site}"`,
      );
    }

    return readJsonBody<T>(response);
  }

  private async getJson<T>(url: string, board: WorkdayBoard): Promise<T> {
    const response = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US",
        "User-Agent": DEFAULT_USER_AGENT,
        Referer: `${board.origin}/${board.site}`,
      },
    });

    if (!response.ok) {
      await drainResponseBody(response);
      throw new Error(
        `Workday CXS detail request failed (${response.status}) for ${url}`,
      );
    }

    return readJsonBody<T>(response);
  }

  private async fetchText(
    url: string,
    headers: Record<string, string>,
  ): Promise<string> {
    const response = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        ...headers,
      },
    });

    if (!response.ok) {
      await drainResponseBody(response);
      throw new Error(
        `Workday careers page request failed (${response.status}) for ${url}`,
      );
    }

    return readTextBody(response);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      WORKDAY_FETCH_TIMEOUT_MS,
    );

    try {
      return await this.fetchFn(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fully buffer the body before parsing. Leaving a large CXS payload unread (or
 * only partially consumed) can pause undici's HTTP/1 parser; a peer FIN then
 * crashes the worker with an uncatchable AssertionError on Node 24.
 */
async function readTextBody(response: Response): Promise<string> {
  if (typeof response.arrayBuffer === "function") {
    const buffer = await response.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }

  return response.text();
}

async function readJsonBody<T>(response: Response): Promise<T> {
  if (typeof response.arrayBuffer === "function") {
    const buffer = await response.arrayBuffer();
    return JSON.parse(new TextDecoder().decode(buffer)) as T;
  }

  return (await response.json()) as T;
}

async function drainResponseBody(response: Response): Promise<void> {
  try {
    if (typeof response.arrayBuffer === "function") {
      await response.arrayBuffer();
      return;
    }
    if (typeof response.text === "function") {
      await response.text();
    }
  } catch {
    // Best-effort drain — ignore secondary read failures.
  }
}
