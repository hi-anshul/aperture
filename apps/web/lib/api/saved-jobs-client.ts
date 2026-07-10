import type {
  SavedJobEntry,
  SavedJobStatus,
  SavedJobsListResponse,
} from "./types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === "string") {
        message = body.message;
      } else if (Array.isArray(body.message) && body.message[0]) {
        message = body.message[0];
      }
    } catch {
      // Keep status-based message when body is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function clientFetchSavedJobs(): Promise<SavedJobsListResponse> {
  const response = await fetch("/api/saved-jobs", { cache: "no-store" });
  return parseJsonResponse<SavedJobsListResponse>(response);
}

export async function clientSaveJob(
  jobId: string,
  status: SavedJobStatus = "interested",
): Promise<SavedJobEntry> {
  const response = await fetch("/api/saved-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, status }),
  });

  return parseJsonResponse<SavedJobEntry>(response);
}

export async function clientUpdateSavedJobStatus(
  savedJobId: string,
  status: SavedJobStatus,
): Promise<SavedJobEntry> {
  const response = await fetch(`/api/saved-jobs/${savedJobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  return parseJsonResponse<SavedJobEntry>(response);
}
