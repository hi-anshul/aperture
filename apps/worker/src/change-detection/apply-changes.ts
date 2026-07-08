import type { JobDiff } from "@aperture/shared";

import type { DedupedJob } from "../dedupe-engine";
import {
  writeDedupedJobs,
  type JobWriteClient,
  type WriteJobsResult,
} from "../sync-company/write-jobs";

import type { ExistingJobForDiff } from "./types";

export interface ApplyChangesClient extends JobWriteClient {
  job: JobWriteClient["job"] & {
    update(args: {
      where: { id: string };
      data: { isActive: false };
    }): Promise<unknown>;
  };
}

export interface ApplyChangesResult extends WriteJobsResult {}

function prepareJobsForWrite(
  deduped: DedupedJob[],
  existingJobs: ExistingJobForDiff[],
): DedupedJob[] {
  const inactiveByExternalId = new Map(
    existingJobs
      .filter((job) => !job.isActive)
      .map((job) => [job.externalId, job]),
  );

  return deduped.map((entry) => {
    if (entry.action !== "update") {
      return entry;
    }

    if (!inactiveByExternalId.has(entry.job.externalId)) {
      return entry;
    }

    return {
      ...entry,
      job: {
        ...entry.job,
        isActive: true,
      },
    };
  });
}

/** Writes deduped jobs and soft-deletes removed postings. */
export async function applyJobChanges(
  client: ApplyChangesClient,
  deduped: DedupedJob[],
  diff: JobDiff,
  existingJobs: ExistingJobForDiff[],
): Promise<ApplyChangesResult> {
  const prepared = prepareJobsForWrite(deduped, existingJobs);
  const result = await writeDedupedJobs(client, prepared);

  return {
    ...result,
    deactivated: diff.removedJobIds.length,
  };
}
