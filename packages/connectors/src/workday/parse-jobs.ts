import type { RawJob } from "@aperture/shared";

import type { WorkdayBoard } from "./types";
import type {
  WorkdayJobDetailResponse,
  WorkdayJobPosting,
  WorkdayJobPostingInfo,
  WorkdayRawJobPayload,
} from "./types";

export function buildWorkdayJobsListUrl(board: WorkdayBoard): string {
  return `${board.origin}/wday/cxs/${board.tenant}/${board.site}/jobs`;
}

export function buildWorkdayJobDetailUrl(
  board: WorkdayBoard,
  externalPath: string,
): string {
  const path = externalPath.startsWith("/")
    ? externalPath
    : `/${externalPath}`;
  return `${board.origin}/wday/cxs/${board.tenant}/${board.site}${path}`;
}

export function buildWorkdayJobSourceUrl(
  board: WorkdayBoard,
  posting: WorkdayJobPosting,
  detail?: WorkdayJobPostingInfo | null,
): string | null {
  if (typeof detail?.externalUrl === "string" && detail.externalUrl.trim()) {
    return detail.externalUrl.trim();
  }

  if (typeof posting.externalPath === "string" && posting.externalPath.trim()) {
    const path = posting.externalPath.startsWith("/")
      ? posting.externalPath
      : `/${posting.externalPath}`;
    return `${board.origin}/${board.site}${path}`;
  }

  return null;
}

export function toWorkdayRawJob(
  board: WorkdayBoard,
  posting: WorkdayJobPosting,
  detailResponse?: WorkdayJobDetailResponse | null,
): RawJob | null {
  const info = detailResponse?.jobPostingInfo ?? null;
  const externalId = resolveExternalId(posting, info);
  const sourceUrl = buildWorkdayJobSourceUrl(board, posting, info);

  if (!externalId || !sourceUrl) {
    return null;
  }

  const raw: WorkdayRawJobPayload = {
    ...posting,
    ...(info ? { jobPostingInfo: info } : {}),
  };

  return {
    sourcePlatform: "workday",
    sourceUrl,
    externalId,
    raw: raw as Record<string, unknown>,
  };
}

export function parseWorkdayJobPostings(
  board: WorkdayBoard,
  postings: WorkdayJobPosting[],
  detailsByPath: Map<string, WorkdayJobDetailResponse> = new Map(),
): RawJob[] {
  const jobs: RawJob[] = [];

  for (const posting of postings) {
    const path =
      typeof posting.externalPath === "string" ? posting.externalPath : "";
    const detail = path ? detailsByPath.get(path) : undefined;
    const rawJob = toWorkdayRawJob(board, posting, detail);
    if (rawJob) {
      jobs.push(rawJob);
    }
  }

  return jobs;
}

function resolveExternalId(
  posting: WorkdayJobPosting,
  info: WorkdayJobPostingInfo | null,
): string | null {
  if (typeof info?.jobReqId === "string" && info.jobReqId.trim()) {
    return info.jobReqId.trim();
  }

  if (typeof info?.id === "string" && info.id.trim()) {
    return info.id.trim();
  }

  const bullet = posting.bulletFields?.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (bullet) {
    return bullet.trim();
  }

  if (typeof posting.externalPath === "string" && posting.externalPath.trim()) {
    const slug = posting.externalPath.split("/").filter(Boolean).at(-1);
    if (slug) {
      return slug;
    }
  }

  return null;
}
