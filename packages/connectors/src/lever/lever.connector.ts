import type { Company, RawJob } from "@aperture/shared";

import type { Connector } from "../connector";
import {
  buildLeverPostingsApiUrl,
  extractLeverSite,
  extractLeverSiteFromHtml,
  isLeverCareersUrl,
} from "./extract-site";
import { parseLeverPostings } from "./parse-jobs";
import type { LeverPosting, LeverSite } from "./types";

const LEVER_FETCH_TIMEOUT_MS = 30_000;
const LEVER_PAGE_SIZE = 100;
const DEFAULT_USER_AGENT = "Aperture/1.0";

export type FetchFn = typeof fetch;

export class LeverConnector implements Connector {
  readonly platform = "lever";

  constructor(private readonly fetchFn: FetchFn = fetch) {}

  canHandle(careersUrl: string): boolean {
    return isLeverCareersUrl(careersUrl);
  }

  async fetch(company: Company): Promise<RawJob[]> {
    const site = await this.resolveSite(company.careersUrl);
    if (!site) {
      throw new Error(
        `Could not extract Lever site from careers URL: ${company.careersUrl}`,
      );
    }

    const postings = await this.fetchAllPostings(site);
    return parseLeverPostings(postings);
  }

  private async resolveSite(careersUrl: string): Promise<LeverSite | null> {
    const fromUrl = extractLeverSite(careersUrl);
    if (fromUrl) {
      return fromUrl;
    }

    // Custom careers pages may embed Lever without a jobs.lever.co URL.
    const html = await this.fetchText(careersUrl);
    return extractLeverSiteFromHtml(html);
  }

  private async fetchAllPostings(site: LeverSite): Promise<LeverPosting[]> {
    const all: LeverPosting[] = [];
    let skip = 0;

    while (true) {
      const url = buildLeverPostingsApiUrl(site, {
        skip,
        limit: LEVER_PAGE_SIZE,
      });
      const page = await this.fetchJsonArray(url);

      if (page.length === 0) {
        break;
      }

      all.push(...page);

      if (page.length < LEVER_PAGE_SIZE) {
        break;
      }

      skip += page.length;
    }

    return all;
  }

  private async fetchJsonArray(url: string): Promise<LeverPosting[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      LEVER_FETCH_TIMEOUT_MS,
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
        `Lever postings API request failed (${response.status}) for ${url}`,
      );
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error(
        `Lever postings API returned a non-array payload for ${url}`,
      );
    }

    return payload as LeverPosting[];
  }

  private async fetchText(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      LEVER_FETCH_TIMEOUT_MS,
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
        `Lever careers page request failed (${response.status}) for ${url}`,
      );
    }

    return response.text();
  }
}
