import type { LeverApiRegion, LeverSite } from "./types";

const LEVER_JOBS_HOST_GLOBAL = /^jobs\.lever\.co$/i;
const LEVER_JOBS_HOST_EU = /^jobs\.eu\.lever\.co$/i;
const LEVER_API_HOST_GLOBAL = /^api\.lever\.co$/i;
const LEVER_API_HOST_EU = /^api\.eu\.lever\.co$/i;

export function isLeverCareersUrl(careersUrl: string): boolean {
  try {
    const { hostname } = new URL(careersUrl);
    return (
      LEVER_JOBS_HOST_GLOBAL.test(hostname) ||
      LEVER_JOBS_HOST_EU.test(hostname) ||
      LEVER_API_HOST_GLOBAL.test(hostname) ||
      LEVER_API_HOST_EU.test(hostname)
    );
  } catch {
    return false;
  }
}

/**
 * Parse site slug + region from a Lever careers / API URL.
 *
 * Supported shapes:
 * - https://jobs.lever.co/{site}
 * - https://jobs.lever.co/{site}/{postingId}
 * - https://jobs.eu.lever.co/{site}
 * - https://api.lever.co/v0/postings/{site}
 * - https://api.eu.lever.co/v0/postings/{site}?mode=json
 */
export function extractLeverSite(careersUrl: string): LeverSite | null {
  try {
    const url = new URL(careersUrl);
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    if (LEVER_JOBS_HOST_GLOBAL.test(host) || LEVER_JOBS_HOST_EU.test(host)) {
      const site = segments[0];
      if (!site) {
        return null;
      }
      return {
        site: decodeURIComponent(site),
        region: LEVER_JOBS_HOST_EU.test(host) ? "eu" : "global",
      };
    }

    if (LEVER_API_HOST_GLOBAL.test(host) || LEVER_API_HOST_EU.test(host)) {
      // /v0/postings/{site}[/...]
      const postingsIndex = segments.findIndex(
        (segment) => segment.toLowerCase() === "postings",
      );
      const site = postingsIndex >= 0 ? segments[postingsIndex + 1] : null;
      if (!site) {
        return null;
      }
      return {
        site: decodeURIComponent(site),
        region: LEVER_API_HOST_EU.test(host) ? "eu" : "global",
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Recover a Lever site from HTML that embeds Lever feed / API URLs
 * (e.g. custom careers pages that load `api.lever.co/v0/postings/{site}`).
 */
export function extractLeverSiteFromHtml(html: string): LeverSite | null {
  const patterns: Array<{ regex: RegExp; region: LeverApiRegion }> = [
    {
      regex:
        /https?:\/\/jobs\.eu\.lever\.co\/([A-Za-z0-9_-]+)/i,
      region: "eu",
    },
    {
      regex: /https?:\/\/api\.eu\.lever\.co\/v0\/postings\/([A-Za-z0-9_-]+)/i,
      region: "eu",
    },
    {
      regex: /https?:\/\/jobs\.lever\.co\/([A-Za-z0-9_-]+)/i,
      region: "global",
    },
    {
      regex: /https?:\/\/api\.lever\.co\/v0\/postings\/([A-Za-z0-9_-]+)/i,
      region: "global",
    },
  ];

  for (const { regex, region } of patterns) {
    const match = regex.exec(html);
    if (match?.[1]) {
      return { site: match[1], region };
    }
  }

  return null;
}

export function buildLeverPostingsApiUrl(
  site: LeverSite,
  options: { skip?: number; limit?: number } = {},
): string {
  const host =
    site.region === "eu" ? "https://api.eu.lever.co" : "https://api.lever.co";
  const url = new URL(
    `${host}/v0/postings/${encodeURIComponent(site.site)}`,
  );
  url.searchParams.set("mode", "json");
  if (typeof options.skip === "number") {
    url.searchParams.set("skip", String(options.skip));
  }
  if (typeof options.limit === "number") {
    url.searchParams.set("limit", String(options.limit));
  }
  return url.toString();
}
