import type { ResumeResponse } from "./types";
import { serverFetch } from "./server";

export async function fetchActiveResume(): Promise<ResumeResponse | null> {
  return serverFetch<ResumeResponse | null>("/resumes");
}
