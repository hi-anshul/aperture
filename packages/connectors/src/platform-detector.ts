import type { PlatformType } from "@aperture/shared";

import { isGreenhouseCareersUrl } from "./greenhouse/extract-board-token";

export type PlatformDetectionSource = "url-pattern" | "content-inspection";

export interface PlatformDetectionResult {
  platform: PlatformType;
  source: PlatformDetectionSource;
  /** Whether a network request was made during detection */
  fetched: boolean;
}

export interface DetectPlatformOptions {
  fetch?: typeof fetch;
  userAgent?: string;
}

const DEFAULT_USER_AGENT = "Aperture/1.0";
const MIN_VISIBLE_TEXT_LENGTH = 150;

const PLATFORM_CONTENT_SIGNATURES: ReadonlyArray<{
  platform: PlatformType;
  patterns: RegExp[];
}> = [
  {
    platform: "greenhouse",
    patterns: [
      /boards-api\.greenhouse\.io/i,
      /boards\.greenhouse\.io/i,
      /grnhse/i,
      /greenhouse\.io/i,
    ],
  },
  {
    platform: "lever",
    patterns: [
      /jobs\.lever\.co/i,
      /api\.lever\.co/i,
      /lever-feed/i,
      /lever\.co\/v0/i,
    ],
  },
  {
    platform: "ashby",
    patterns: [
      /jobs\.ashbyhq\.com/i,
      /ashbyhq\.com/i,
      /ashby\.js/i,
      /AshbyJobBoard/i,
    ],
  },
  {
    platform: "workday",
    patterns: [
      /myworkdayjobs\.com/i,
      /workday\.com\/wday\/cxs/i,
      /wd\d+\.myworkdayjobs\.com/i,
    ],
  },
];

const JOB_LISTING_PATTERNS = [
  /schema\.org\/JobPosting/i,
  /itemtype=["']https?:\/\/schema\.org\/JobPosting["']/i,
  /data-job-id/i,
  /class=["'][^"']*\b(job-list|job-listing|job-card|posting-title|careers-job)\b/i,
  /href=["'][^"']*\/(jobs?|careers|openings)\/[^"']+["']/gi,
];

const SPA_SHELL_PATTERNS = [
  /<div[^>]+id=["'](root|__next|app|main)["'][^>]*>\s*<\/div>/i,
  /you need to enable javascript/i,
  /javascript is (required|disabled|not enabled)/i,
  /<noscript>/i,
];

/**
 * Fast-path URL pattern matching — no network call.
 * Returns null when no known pattern matches.
 */
export function detectPlatformFromUrl(careersUrl: string): PlatformType | null {
  try {
    const url = new URL(careersUrl);
    const host = url.hostname.toLowerCase();

    if (isGreenhouseCareersUrl(careersUrl)) {
      return "greenhouse";
    }
    if (host === "jobs.lever.co") {
      return "lever";
    }
    if (host === "jobs.ashbyhq.com") {
      return "ashby";
    }
    if (host === "myworkdayjobs.com" || host.endsWith(".myworkdayjobs.com")) {
      return "workday";
    }

    return null;
  } catch {
    return null;
  }
}

function stripNonVisibleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countScriptTags(html: string): number {
  return (html.match(/<script[\s>]/gi) ?? []).length;
}

function hasJobListingIndicators(html: string): boolean {
  for (const pattern of JOB_LISTING_PATTERNS) {
    if (pattern.global) {
      pattern.lastIndex = 0;
    }
    if (pattern.test(html)) {
      return true;
    }
  }

  const careerLinks = html.match(/href=["'][^"']*\/(jobs?|careers|openings)\/[^"']+["']/gi);
  return (careerLinks?.length ?? 0) >= 2;
}

function looksLikeSpaShell(html: string): boolean {
  const visibleText = stripNonVisibleHtml(html);
  if (visibleText.length >= MIN_VISIBLE_TEXT_LENGTH) {
    return false;
  }

  if (SPA_SHELL_PATTERNS.some((pattern) => pattern.test(html))) {
    return true;
  }

  return countScriptTags(html) >= 3 && visibleText.length < MIN_VISIBLE_TEXT_LENGTH;
}

function detectPlatformFromContent(html: string): PlatformType {
  for (const { platform, patterns } of PLATFORM_CONTENT_SIGNATURES) {
    if (patterns.some((pattern) => pattern.test(html))) {
      return platform;
    }
  }

  if (looksLikeSpaShell(html)) {
    return "react-rendered";
  }

  if (hasJobListingIndicators(html)) {
    return "static-html";
  }

  return "unknown";
}

/**
 * Inspects fetched HTML for platform signatures, static job listings, or SPA shells.
 */
export function inspectPageContent(html: string): PlatformType {
  return detectPlatformFromContent(html);
}

const PLATFORM_DETECT_TIMEOUT_MS = 15_000;

/**
 * Given a careers URL, determine which connector should handle it.
 * Uses URL patterns first, then a single fetch + content inspection fallback.
 */
export async function detectPlatform(
  careersUrl: string,
  options: DetectPlatformOptions = {},
): Promise<PlatformDetectionResult> {
  const fromUrl = detectPlatformFromUrl(careersUrl);
  if (fromUrl) {
    return {
      platform: fromUrl,
      source: "url-pattern",
      fetched: false,
    };
  }

  const fetchFn = options.fetch ?? fetch;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  try {
    const response = await fetchFn(careersUrl, {
      headers: { "User-Agent": userAgent },
      redirect: "follow",
      signal: AbortSignal.timeout(PLATFORM_DETECT_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        platform: "unknown",
        source: "content-inspection",
        fetched: true,
      };
    }

    const html = await response.text();
    return {
      platform: detectPlatformFromContent(html),
      source: "content-inspection",
      fetched: true,
    };
  } catch {
    return {
      platform: "unknown",
      source: "content-inspection",
      fetched: true,
    };
  }
}
