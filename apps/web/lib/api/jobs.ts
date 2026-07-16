import type { JobsListResponse } from "./types";
import { JOBS_PAGE_SIZE } from "@/lib/jobs/pagination";
import { serverFetch } from "./server";

export async function fetchJobs(
  params: Record<string, string> = {},
): Promise<JobsListResponse> {
  const searchParams = new URLSearchParams({
    page: "1",
    limit: String(JOBS_PAGE_SIZE),
    ...params,
  });

  return serverFetch<JobsListResponse>(`/jobs?${searchParams.toString()}`);
}
