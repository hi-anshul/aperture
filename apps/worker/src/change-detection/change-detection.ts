import type { JobDiff, NormalizedJob } from "@aperture/shared";

import type { DedupedJob } from "../dedupe-engine";
import type { ExistingJobForDiff } from "./types";

export function hasMeaningfulChange(
  existing: ExistingJobForDiff,
  incoming: NormalizedJob,
): boolean {
  return (
    existing.title !== incoming.title ||
    existing.location !== incoming.location ||
    existing.salaryMin !== incoming.salaryMin ||
    existing.salaryMax !== incoming.salaryMax ||
    existing.salaryCurrency !== incoming.salaryCurrency
  );
}

/**
 * Diffs deduped sync results against the current jobs table state.
 * Compares directly against existing rows — no separate snapshot cache.
 */
export function computeJobDiff(
  companyId: string,
  deduped: DedupedJob[],
  existingJobs: ExistingJobForDiff[],
): JobDiff {
  const existingByExternalId = new Map(
    existingJobs.map((job) => [job.externalId, job]),
  );

  const newJobs: NormalizedJob[] = [];
  const updatedJobs: NormalizedJob[] = [];

  for (const entry of deduped) {
    if (entry.action === "deactivate") {
      continue;
    }

    if (entry.action === "insert") {
      newJobs.push(entry.job);
      continue;
    }

    const existing = existingByExternalId.get(entry.job.externalId);
    if (!existing) {
      continue;
    }

    if (!existing.isActive || hasMeaningfulChange(existing, entry.job)) {
      updatedJobs.push(entry.job);
    }
  }

  const removedJobIds = deduped
    .filter((entry) => entry.action === "deactivate")
    .map((entry) => entry.job.id);

  return {
    companyId,
    newJobs,
    removedJobIds,
    updatedJobs,
  };
}

export function isEmptyDiff(diff: JobDiff): boolean {
  return (
    diff.newJobs.length === 0 &&
    diff.removedJobIds.length === 0 &&
    diff.updatedJobs.length === 0
  );
}
