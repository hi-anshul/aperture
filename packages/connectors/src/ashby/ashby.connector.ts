import type { Company, RawJob } from "@aperture/shared";

import type { Connector } from "../connector";
import {
  buildAshbyJobBoardApiUrl,
  extractAshbyBoard,
  extractAshbyBoardFromHtml,
  isAshbyCareersUrl,
} from "./extract-board";
import { parseAshbyJobs } from "./parse-jobs";
import type { AshbyBoard, AshbyJobsResponse } from "./types";

const ASHBY_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT = "Aperture/1.0";

export type FetchFn = typeof fetch;

export class AshbyConnector implements Connector {
  readonly platform = "ashby";

  constructor(private readonly fetchFn: FetchFn = fetch) {}

  canHandle(careersUrl: string): boolean {
    return isAshbyCareersUrl(careersUrl);
  }

  async fetch(company: Company): Promise<RawJob[]> {
    const board = await this.resolveBoard(company.careersUrl);
    if (!board) {
      throw new Error(
        `Could not extract Ashby board from careers URL: ${company.careersUrl}`,
      );
    }

    const payload = await this.fetchJobBoard(board);
    return parseAshbyJobs(payload);
  }

  private async resolveBoard(careersUrl: string): Promise<AshbyBoard | null> {
    const fromUrl = extractAshbyBoard(careersUrl);
    if (fromUrl) {
      return fromUrl;
    }

    const html = await this.fetchText(careersUrl);
    return extractAshbyBoardFromHtml(html);
  }

  private async fetchJobBoard(board: AshbyBoard): Promise<AshbyJobsResponse> {
    const url = buildAshbyJobBoardApiUrl(board);
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      ASHBY_FETCH_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": DEFAULT_USER_AGENT,
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(
        `Ashby job board API request failed (${response.status}) for board "${board.boardName}"`,
      );
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") {
      throw new Error(
        `Ashby job board API returned a non-object payload for board "${board.boardName}"`,
      );
    }

    return payload as AshbyJobsResponse;
  }

  private async fetchText(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      ASHBY_FETCH_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": DEFAULT_USER_AGENT,
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(
        `Ashby careers page request failed (${response.status}) for ${url}`,
      );
    }

    return response.text();
  }
}
