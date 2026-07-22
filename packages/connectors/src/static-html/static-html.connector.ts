import type { Company, RawJob } from "@aperture/shared";

import type { Connector } from "../connector";
import { parseHtmlJobs } from "./parse-html-jobs";
import type { StaticHtmlSelectorMap } from "./types";

const STATIC_HTML_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT = "Aperture/1.0";

export type FetchFn = typeof fetch;

export interface StaticHtmlConnectorOptions {
  fetchFn?: FetchFn;
  selectors?: Partial<StaticHtmlSelectorMap>;
}

/**
 * Generic static-HTML careers connector.
 * Fetches the careers page over HTTP and parses listings via CSS selectors.
 *
 * Selected by platform detection (`static-html`), not URL pattern —
 * `canHandle` always returns false so ATS connectors win URL resolve first.
 */
export class StaticHtmlConnector implements Connector {
  readonly platform = "static-html";

  private readonly fetchFn: FetchFn;
  private readonly selectors?: Partial<StaticHtmlSelectorMap>;

  constructor(options: StaticHtmlConnectorOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.selectors = options.selectors;
  }

  canHandle(_careersUrl: string): boolean {
    return false;
  }

  async fetch(company: Company): Promise<RawJob[]> {
    const html = await this.fetchText(company.careersUrl);
    return parseHtmlJobs(html, {
      sourcePlatform: "static-html",
      baseUrl: company.careersUrl,
      selectors: this.selectors,
    });
  }

  private async fetchText(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      STATIC_HTML_FETCH_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": DEFAULT_USER_AGENT,
        },
        redirect: "follow",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(
        `Static HTML careers page request failed (${response.status}) for ${url}`,
      );
    }

    return response.text();
  }
}
