import type { PlatformType } from "@aperture/shared";

/**
 * Configurable CSS-selector map for generic careers pages.
 * Selectors are relative to each job item unless noted.
 */
export interface StaticHtmlSelectorMap {
  /** Each job listing node on the page */
  jobItem: string;
  /** Title text within a job item */
  title: string;
  /** Link to the posting within a job item */
  link: string;
  /** Optional location text within a job item */
  location?: string;
  /** Optional description / snippet within a job item */
  description?: string;
  /** Optional stable external id attribute (e.g. [data-job-id]) */
  externalIdAttr?: string;
}

/** Parsed listing before wrapping as RawJob */
export interface StaticHtmlListing {
  title: string;
  /** Absolute posting URL, or careers page URL when the card has no link */
  href: string;
  location: string | null;
  description: string | null;
  externalId: string;
}

export interface ParseHtmlJobsOptions {
  sourcePlatform: Extract<PlatformType, "static-html" | "react-rendered">;
  /** Careers page URL — used to absolutize relative links */
  baseUrl: string;
  selectors?: Partial<StaticHtmlSelectorMap>;
}
