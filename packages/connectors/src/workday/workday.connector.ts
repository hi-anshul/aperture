import type { Company, RawJob } from "@aperture/shared";

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
const WORKDAY_DETAIL_CONCURRENCY = 5;
const DEFAULT_USER_AGENT = "Aperture/1.0";

export type FetchFn = typeof fetch;

export class WorkdayConnector implements Connector {
  readonly platform = "workday";

  constructor(private readonly fetchFn: FetchFn = fetch) {}

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
      throw new Error(
        `Workday CXS list request failed (${response.status}) for site "${board.site}"`,
      );
    }

    return (await response.json()) as T;
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
      throw new Error(
        `Workday CXS detail request failed (${response.status}) for ${url}`,
      );
    }

    return (await response.json()) as T;
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
      throw new Error(
        `Workday careers page request failed (${response.status}) for ${url}`,
      );
    }

    return response.text();
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
