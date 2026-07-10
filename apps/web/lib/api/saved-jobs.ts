import type { SavedJobsListResponse } from "./types";
import { serverFetch } from "./server";

export async function fetchSavedJobs(): Promise<SavedJobsListResponse> {
  return serverFetch<SavedJobsListResponse>("/saved-jobs");
}
