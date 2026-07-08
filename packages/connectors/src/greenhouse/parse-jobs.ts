import type { RawJob } from "@aperture/shared";

import type { GreenhouseJob, GreenhouseJobsResponse } from "./types";

export function parseGreenhouseJobs(response: GreenhouseJobsResponse): RawJob[] {
  return response.jobs.map(toRawJob);
}

function toRawJob(job: GreenhouseJob): RawJob {
  return {
    sourcePlatform: "greenhouse",
    sourceUrl: job.absolute_url,
    externalId: String(job.id),
    raw: job as Record<string, unknown>,
  };
}
