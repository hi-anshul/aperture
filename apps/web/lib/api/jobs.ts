import type { JobsListResponse } from "./types";
import { serverFetch } from "./server";

export async function fetchJobs(): Promise<JobsListResponse> {
  return serverFetch<JobsListResponse>("/jobs");
}
