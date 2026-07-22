import type { NormalizedJob, RawJob } from "@aperture/shared";

import { normalizeAshbyJob } from "./ashby/ashby.normalizer";
import { normalizeGreenhouseJob } from "./greenhouse/greenhouse.normalizer";
import { normalizeHtmlJob } from "./html/html.normalizer";
import { normalizeLeverJob } from "./lever/lever.normalizer";
import { normalizeWorkdayJob } from "./workday/workday.normalizer";
import type { NormalizeContext } from "./types";

export class NormalizerEngine {
  normalize(job: RawJob, context: NormalizeContext): NormalizedJob {
    switch (job.sourcePlatform) {
      case "greenhouse":
        return normalizeGreenhouseJob(job, context);
      case "lever":
        return normalizeLeverJob(job, context);
      case "ashby":
        return normalizeAshbyJob(job, context);
      case "workday":
        return normalizeWorkdayJob(job, context);
      case "static-html":
      case "react-rendered":
        return normalizeHtmlJob(job, context);
      default:
        throw new Error(
          `No normalizer registered for platform "${job.sourcePlatform}"`,
        );
    }
  }

  normalizeMany(jobs: RawJob[], context: NormalizeContext): NormalizedJob[] {
    return jobs.map((job) => this.normalize(job, context));
  }
}

export function createNormalizerEngine(): NormalizerEngine {
  return new NormalizerEngine();
}
