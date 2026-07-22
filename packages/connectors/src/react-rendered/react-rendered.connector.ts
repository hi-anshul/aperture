import type { Company, RawJob } from "@aperture/shared";

import type { Connector } from "../connector";
import { parseHtmlJobs } from "../static-html/parse-html-jobs";
import type { StaticHtmlSelectorMap } from "../static-html/types";

/**
 * Fetches fully-rendered HTML (typically via Playwright / Fetch Engine browser mode).
 * Signature includes companyId so the worker can rate-limit per company.
 */
export type BrowserFetchHtmlFn = (
  url: string,
  companyId: string,
) => Promise<string>;

export interface ReactRenderedConnectorOptions {
  browserFetchHtml: BrowserFetchHtmlFn;
  selectors?: Partial<StaticHtmlSelectorMap>;
}

/**
 * Browser-rendered (SPA) careers connector.
 * Playwright renders the page; parsing reuses the static-HTML selector parser.
 *
 * Selected by platform detection (`react-rendered`), not URL pattern.
 */
export class ReactRenderedConnector implements Connector {
  readonly platform = "react-rendered";

  private readonly browserFetchHtml: BrowserFetchHtmlFn;
  private readonly selectors?: Partial<StaticHtmlSelectorMap>;

  constructor(options: ReactRenderedConnectorOptions) {
    this.browserFetchHtml = options.browserFetchHtml;
    this.selectors = options.selectors;
  }

  canHandle(_careersUrl: string): boolean {
    return false;
  }

  async fetch(company: Company): Promise<RawJob[]> {
    const html = await this.browserFetchHtml(
      company.careersUrl,
      company.id,
    );

    return parseHtmlJobs(html, {
      sourcePlatform: "react-rendered",
      baseUrl: company.careersUrl,
      selectors: this.selectors,
    });
  }
}
