import * as cheerio from "cheerio";
import type { RawJob } from "@aperture/shared";

import { DEFAULT_STATIC_HTML_SELECTORS } from "./default-selectors";
import type {
  ParseHtmlJobsOptions,
  StaticHtmlListing,
  StaticHtmlSelectorMap,
} from "./types";

type CheerioRoot = ReturnType<typeof cheerio.load>;
type CheerioSelection = ReturnType<CheerioRoot>;

/**
 * Parse a careers-page HTML document into RawJob[] using a CSS-selector map.
 * Shared by `static-html` (HTTP fetch) and `react-rendered` (Playwright fetch).
 */
export function parseHtmlJobs(
  html: string,
  options: ParseHtmlJobsOptions,
): RawJob[] {
  const selectors = mergeSelectors(options.selectors);
  const $ = cheerio.load(html);
  const listings: StaticHtmlListing[] = [];
  const seen = new Set<string>();

  for (const listing of extractJsonLdListings($, options.baseUrl)) {
    pushUnique(listings, seen, listing);
  }

  $(selectors.jobItem).each((_, element) => {
    const $el = $(element);
    // Prefer the outermost job node when selectors match nested wrappers
    // (e.g. .job-item > .job-card).
    if ($el.parents(selectors.jobItem).length > 0) {
      return;
    }

    const listing = extractListingFromElement($, $el, selectors, options.baseUrl);
    if (listing) {
      pushUnique(listings, seen, listing);
    }
  });

  if (listings.length === 0) {
    for (const listing of extractCareerLinkListings($, options.baseUrl)) {
      pushUnique(listings, seen, listing);
    }
  }

  return listings.map((listing) => toRawJob(listing, options.sourcePlatform));
}

function mergeSelectors(
  overrides?: Partial<StaticHtmlSelectorMap>,
): StaticHtmlSelectorMap {
  return {
    ...DEFAULT_STATIC_HTML_SELECTORS,
    ...overrides,
  };
}

function pushUnique(
  listings: StaticHtmlListing[],
  seen: Set<string>,
  listing: StaticHtmlListing,
): void {
  const key = listing.externalId.toLowerCase();
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  listings.push(listing);
}

function toRawJob(
  listing: StaticHtmlListing,
  sourcePlatform: ParseHtmlJobsOptions["sourcePlatform"],
): RawJob {
  return {
    sourcePlatform,
    sourceUrl: listing.href,
    externalId: listing.externalId,
    raw: {
      title: listing.title,
      href: listing.href,
      location: listing.location,
      description: listing.description,
      externalId: listing.externalId,
    },
  };
}

function extractListingFromElement(
  $: CheerioRoot,
  $el: CheerioSelection,
  selectors: StaticHtmlSelectorMap,
  baseUrl: string,
): StaticHtmlListing | null {
  const href =
    absolutizeUrl(
      firstNonEmpty(
        $el.find(selectors.link).first().attr("href"),
        $el.is("a") ? $el.attr("href") : undefined,
      ),
      baseUrl,
    ) ?? null;

  const location = selectors.location
    ? normalizeLocation(textOf($el.find(selectors.location).first()))
    : null;

  const title = extractTitle($el, selectors, location);
  if (!title) {
    return null;
  }

  // Link-less cards (e.g. Flipkart jobslist) still count — point at the listing page.
  const resolvedHref = href ?? stripUrlHash(baseUrl);

  const description = selectors.description
    ? textOf($el.find(selectors.description).first())
    : null;

  const attrId = selectors.externalIdAttr
    ? firstNonEmpty(
        $el.attr(selectors.externalIdAttr),
        $el
          .find(`[${selectors.externalIdAttr}]`)
          .first()
          .attr(selectors.externalIdAttr),
      )
    : null;

  return {
    title,
    href: resolvedHref,
    location,
    description,
    externalId: deriveExternalId(
      href,
      attrId,
      href ? null : `${title}|${location ?? ""}`,
    ),
  };
}

/**
 * Prefer an explicit title node; avoid swallowing location text from the whole card.
 */
function extractTitle(
  $el: CheerioSelection,
  selectors: StaticHtmlSelectorMap,
  location: string | null,
): string | null {
  const fromSelector = textOf($el.find(selectors.title).first());
  if (fromSelector && fromSelector !== location) {
    return fromSelector;
  }

  const full = textOf($el);
  if (!full) {
    return null;
  }

  if (location && full.endsWith(location)) {
    const withoutLocation = full
      .slice(0, full.length - location.length)
      .replace(/\s*Location\s*:?\s*$/i, "")
      .trim();
    return withoutLocation.length > 0 ? withoutLocation : full;
  }

  return full;
}

function normalizeLocation(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.replace(/^Location\s*:?\s*/i, "").trim() || null;
}

function stripUrlHash(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractJsonLdListings(
  $: CheerioRoot,
  baseUrl: string,
): StaticHtmlListing[] {
  const listings: StaticHtmlListing[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return;
    }

    for (const node of flattenJsonLd(parsed)) {
      if (!isJobPosting(node)) {
        continue;
      }

      const title = asNonEmptyString(node.title);
      const href = absolutizeUrl(
        asNonEmptyString(node.url) ?? asNonEmptyString(node.sameAs),
        baseUrl,
      );
      if (!title || !href) {
        continue;
      }

      listings.push({
        title,
        href,
        location: extractJsonLdLocation(node),
        description: asNonEmptyString(node.description),
        externalId: deriveExternalId(
          href,
          asNonEmptyString(node.identifier) ?? asNonEmptyString(node["@id"]),
        ),
      });
    }
  });

  return listings;
}

function extractCareerLinkListings(
  $: CheerioRoot,
  baseUrl: string,
): StaticHtmlListing[] {
  const listings: StaticHtmlListing[] = [];
  const linkPattern = /\/(jobs?|careers|openings)\//i;

  $("a[href]").each((_, el) => {
    const href = absolutizeUrl($(el).attr("href"), baseUrl);
    if (!href || !linkPattern.test(href)) {
      return;
    }

    const title = textOf($(el));
    if (!title || title.length < 3) {
      return;
    }

    listings.push({
      title,
      href,
      location: null,
      description: null,
      externalId: deriveExternalId(href, null),
    });
  });

  return listings;
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenJsonLd(entry));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  if (Array.isArray(record["@graph"])) {
    return flattenJsonLd(record["@graph"]);
  }

  return [record];
}

function isJobPosting(node: Record<string, unknown>): boolean {
  const type = node["@type"];
  if (typeof type === "string") {
    return /jobposting/i.test(type);
  }
  if (Array.isArray(type)) {
    return type.some(
      (entry) => typeof entry === "string" && /jobposting/i.test(entry),
    );
  }
  return false;
}

function extractJsonLdLocation(node: Record<string, unknown>): string | null {
  const jobLocation = node.jobLocation;
  if (typeof jobLocation === "string") {
    return asNonEmptyString(jobLocation);
  }
  if (jobLocation && typeof jobLocation === "object") {
    const loc = jobLocation as Record<string, unknown>;
    const address = loc.address;
    if (typeof address === "string") {
      return asNonEmptyString(address);
    }
    if (address && typeof address === "object") {
      const addr = address as Record<string, unknown>;
      const parts = [
        asNonEmptyString(addr.addressLocality),
        asNonEmptyString(addr.addressRegion),
        asNonEmptyString(addr.addressCountry),
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
    return asNonEmptyString(loc.name);
  }
  return null;
}

function deriveExternalId(
  href: string | null,
  explicitId: string | null,
  fallbackKey: string | null = null,
): string {
  if (explicitId) {
    return explicitId;
  }

  if (href) {
    try {
      const url = new URL(href);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      return `${path}${url.search}`;
    } catch {
      return href;
    }
  }

  const slug = slugify(fallbackKey ?? "job");
  return `listing:${slug}`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/\.{2,}/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug.length > 0 ? slug : "job";
}

function absolutizeUrl(
  href: string | null | undefined,
  baseUrl: string,
): string | null {
  const trimmed = href?.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.toLowerCase().startsWith("javascript:")
  ) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function textOf(selection: CheerioSelection): string | null {
  const text = selection.text().replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}
