import type { Queue } from "bullmq";
import type { NotifyJobQueueData } from "@aperture/shared";
import { NOTIFY_JOB_NAME } from "@aperture/shared";

export type NotifyQueue = Pick<Queue<NotifyJobQueueData>, "add">;

export interface EnqueueNotifyOptions {
  /** Stable BullMQ job id for idempotency within a sync/match cycle. */
  jobId?: string;
}

/** Enqueues a single notification dispatch job. */
export async function enqueueNotifyJob(
  queue: NotifyQueue,
  data: NotifyJobQueueData,
  options: EnqueueNotifyOptions = {},
): Promise<void> {
  await queue.add(NOTIFY_JOB_NAME, data, {
    jobId: options.jobId,
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
  });
}
