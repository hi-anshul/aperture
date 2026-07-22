import type { StaticHtmlSelectorMap } from "./types";

/**
 * Default selector map — covers common career-page patterns and the
 * platform-detector job-listing heuristics (job-list, job-listing, job-card, etc.).
 */
export const DEFAULT_STATIC_HTML_SELECTORS: StaticHtmlSelectorMap = {
  jobItem:
    ".job-listing, .job-item, .job-card, .job-list > li, [class*='job-listing'], [class*='job-item'], [class*='job-card'], [data-job-id], [itemtype*='JobPosting']",
  title:
    "a, .job-title, .posting-title, [class*='job-title'], [class*='posting-title'], h1, h2, h3, h4, h5, h6",
  link: "a[href]",
  location: ".location, .job-location, [class*='location']",
  description: ".description, .job-description, [class*='description']",
  externalIdAttr: "data-job-id",
};
