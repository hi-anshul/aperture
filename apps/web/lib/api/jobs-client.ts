import type {
  JobDetail,
  JobRescoreResponse,
  JobsListResponse,
} from "./types";

export async function clientFetchJobs(
  params: Record<string, string>,
): Promise<JobsListResponse> {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) {
      searchParams.set(key, value.trim());
    }
  }

  const query = searchParams.toString();
  const path = query ? `/api/jobs?${query}` : "/api/jobs";

  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<JobsListResponse>;
}

export async function clientFetchJob(jobId: string): Promise<JobDetail> {
  const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<JobDetail>;
}

export async function clientRescoreJob(
  jobId: string,
): Promise<JobRescoreResponse> {
  const response = await fetch(`/api/jobs/${jobId}/rescore`, {
    method: "POST",
    cache: "no-store",
  });

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

  return response.json() as Promise<JobRescoreResponse>;
}
