import type { WorkdayBoard } from "./types";

const WORKDAY_HOST_PATTERN = /(^|\.)myworkdayjobs\.com$/i;
const LOCALE_SEGMENT_PATTERN = /^[a-z]{2}(?:-[A-Za-z]{2})?$/i;
const SKIP_PATH_SEGMENTS = new Set(["wday", "cxs", "job", "jobs", "apply"]);

export function isWorkdayCareersUrl(careersUrl: string): boolean {
  try {
    const { hostname } = new URL(careersUrl);
    return WORKDAY_HOST_PATTERN.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Parse tenant / site / host from a `*.myworkdayjobs.com` careers URL.
 *
 * Supported shapes:
 * - https://adobe.wd5.myworkdayjobs.com/external_experienced
 * - https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced
 * - https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs
 */
export function extractWorkdayBoard(careersUrl: string): WorkdayBoard | null {
  if (!isWorkdayCareersUrl(careersUrl)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(careersUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const origin = url.origin;
  const segments = url.pathname.split("/").filter(Boolean);

  const tenantFromHost = extractTenantFromHost(host);
  const cxsTenantIndex = segments.findIndex(
    (segment, index) =>
      segment.toLowerCase() === "cxs" && index + 2 < segments.length,
  );

  if (cxsTenantIndex >= 0) {
    const tenant = segments[cxsTenantIndex + 1]!;
    const site = segments[cxsTenantIndex + 2]!;
    return { tenant, site, host, origin };
  }

  const site = extractSiteFromPath(segments);
  if (!site) {
    return null;
  }

  const tenant = tenantFromHost;
  if (!tenant) {
    return null;
  }

  return { tenant, site, host, origin };
}

/**
 * Recover a Workday board from HTML that links to `*.myworkdayjobs.com`
 * (custom careers domains such as careers.adobe.com).
 */
export function extractWorkdayBoardFromHtml(html: string): WorkdayBoard | null {
  const pattern =
    /https?:\/\/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}(?:-[A-Za-z]{2})?\/)?([A-Za-z0-9_-]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const tenant = match[1]!;
    const cluster = match[2]!;
    const site = match[3]!;

    if (SKIP_PATH_SEGMENTS.has(site.toLowerCase())) {
      continue;
    }

    const host = `${tenant}.${cluster}.myworkdayjobs.com`;
    return {
      tenant,
      site,
      host,
      origin: `https://${host}`,
    };
  }

  return null;
}

function extractTenantFromHost(host: string): string | null {
  // adobe.wd5.myworkdayjobs.com → adobe
  const match = /^([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com$/i.exec(host);
  return match?.[1] ?? null;
}

function extractSiteFromPath(segments: string[]): string | null {
  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (LOCALE_SEGMENT_PATTERN.test(segment)) {
      continue;
    }
    if (SKIP_PATH_SEGMENTS.has(lower)) {
      continue;
    }
    return segment;
  }

  return null;
}
