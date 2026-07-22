import type { AshbyBoard } from "./types";

const ASHBY_JOBS_HOST = /^jobs\.ashbyhq\.com$/i;
const ASHBY_API_HOST = /^api\.ashbyhq\.com$/i;

export function isAshbyCareersUrl(careersUrl: string): boolean {
  try {
    const { hostname } = new URL(careersUrl);
    return ASHBY_JOBS_HOST.test(hostname) || ASHBY_API_HOST.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Parse board slug from an Ashby careers / API URL.
 *
 * Supported shapes:
 * - https://jobs.ashbyhq.com/{board}
 * - https://jobs.ashbyhq.com/{board}/{jobId}
 * - https://jobs.ashbyhq.com/{board}/embed.js
 * - https://api.ashbyhq.com/posting-api/job-board/{board}
 */
export function extractAshbyBoard(careersUrl: string): AshbyBoard | null {
  try {
    const url = new URL(careersUrl);
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    if (ASHBY_JOBS_HOST.test(host)) {
      const boardName = segments[0];
      if (!boardName || boardName.toLowerCase() === "embed.js") {
        return null;
      }
      return { boardName: decodeURIComponent(boardName) };
    }

    if (ASHBY_API_HOST.test(host)) {
      // /posting-api/job-board/{board}
      const boardIndex = segments.findIndex(
        (segment) => segment.toLowerCase() === "job-board",
      );
      const boardName = boardIndex >= 0 ? segments[boardIndex + 1] : null;
      if (!boardName) {
        return null;
      }
      return { boardName: decodeURIComponent(boardName) };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Recover an Ashby board from HTML that embeds Ashby jobs / API URLs
 * (e.g. custom careers pages that load `jobs.ashbyhq.com/{board}/embed.js`).
 */
export function extractAshbyBoardFromHtml(html: string): AshbyBoard | null {
  const patterns = [
    /https?:\/\/jobs\.ashbyhq\.com\/([A-Za-z0-9_-]+)(?:\/|$|"|'|\?)/i,
    /https?:\/\/api\.ashbyhq\.com\/posting-api\/job-board\/([A-Za-z0-9_-]+)/i,
  ];

  for (const regex of patterns) {
    const match = regex.exec(html);
    if (match?.[1] && match[1].toLowerCase() !== "embed.js") {
      return { boardName: match[1] };
    }
  }

  return null;
}

export function buildAshbyJobBoardApiUrl(board: AshbyBoard): string {
  const url = new URL(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.boardName)}`,
  );
  url.searchParams.set("includeCompensation", "true");
  return url.toString();
}
