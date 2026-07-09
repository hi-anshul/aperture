import type { ResumeResponse } from "./types";

async function readErrorMessage(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw) {
    return `API request failed: ${response.status}`;
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(" ");
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    // Non-JSON error body — return as-is.
  }

  return raw;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function clientFetchActiveResume(): Promise<ResumeResponse | null> {
  const response = await fetch("/api/resumes", { cache: "no-store" });
  return parseJsonResponse<ResumeResponse | null>(response);
}

export async function clientUploadResume(file: File): Promise<ResumeResponse> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/resumes", {
    method: "POST",
    body,
  });

  return parseJsonResponse<ResumeResponse>(response);
}
