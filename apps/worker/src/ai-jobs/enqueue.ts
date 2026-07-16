import type { Queue } from "bullmq";
import type { JobDiff } from "@aperture/shared";

import {
  AI_MATCH_JOB_NAME,
  type MatchJobQueueData,
} from "./constants";

export type MatchQueue = Pick<Queue<MatchJobQueueData>, "add">;

/**
 * Enqueues one AI match job per new posting from Change Detection.
 * Failures to enqueue should be logged by the caller — sync itself already succeeded.
 */
export async function enqueueMatchJobsForDiff(
  queue: MatchQueue,
  diff: JobDiff,
): Promise<number> {
  if (diff.newJobs.length === 0) {
    return 0;
  }

  let enqueued = 0;

  for (const job of diff.newJobs) {
    await queue.add(
      AI_MATCH_JOB_NAME,
      { jobId: job.id },
      {
        jobId: `match-${job.id}`,
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
      },
    );
    enqueued += 1;
  }

  return enqueued;
}

/** Enqueues a single on-demand re-score (dashboard / API). */
export async function enqueueMatchJob(
  queue: MatchQueue,
  data: MatchJobQueueData,
): Promise<void> {
  await queue.add(AI_MATCH_JOB_NAME, data, {
    jobId: `match-${data.jobId}-${Date.now()}`,
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
  });
}
