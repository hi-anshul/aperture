import type { Company, RawJob } from "@aperture/shared";

import type { Connector } from "../connector";
import { extractBoardToken, isGreenhouseCareersUrl } from "./extract-board-token";
import { parseGreenhouseJobs } from "./parse-jobs";
import type { GreenhouseJobsResponse } from "./types";

const GREENHOUSE_JOBS_API = "https://boards-api.greenhouse.io/v1/boards";
const GREENHOUSE_FETCH_TIMEOUT_MS = 30_000;

export type FetchFn = typeof fetch;

export class GreenhouseConnector implements Connector {
  readonly platform = "greenhouse";

  constructor(private readonly fetchFn: FetchFn = fetch) {}

  canHandle(careersUrl: string): boolean {
    return isGreenhouseCareersUrl(careersUrl);
  }

  async fetch(company: Company): Promise<RawJob[]> {
    const boardToken = extractBoardToken(company.careersUrl);
    if (!boardToken) {
      throw new Error(
        `Could not extract Greenhouse board token from careers URL: ${company.careersUrl}`,
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      GREENHOUSE_FETCH_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await this.fetchFn(
        `${GREENHOUSE_JOBS_API}/${boardToken}/jobs?content=true`,
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(
        `Greenhouse API request failed (${response.status}) for board "${boardToken}"`,
      );
    }

    const payload = (await response.json()) as GreenhouseJobsResponse;
    return parseGreenhouseJobs(payload);
  }
}
