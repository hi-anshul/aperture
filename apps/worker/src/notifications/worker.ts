import { Worker, type ConnectionOptions } from "bullmq";
import type { NotifyJobQueueData } from "@aperture/shared";

import { NOTIFY_JOB_NAME, NOTIFY_QUEUE_NAME } from "./constants";
import { processNotifyJob, type NotifyJobStore } from "./processor";

export interface NotifyWorkerHandle {
  worker: Worker<NotifyJobQueueData>;
  close(): Promise<void>;
}

/**
 * BullMQ worker that delivers one notification per queue job.
 * Failures are isolated and retryable — sent_at stays null until delivery succeeds.
 */
export function createNotifyWorker(
  connection: ConnectionOptions,
  store: NotifyJobStore,
): NotifyWorkerHandle {
  const worker = new Worker<NotifyJobQueueData>(
    NOTIFY_QUEUE_NAME,
    async (job) => {
      if (job.name !== NOTIFY_JOB_NAME) {
        throw new Error(`Unknown notify job name: ${job.name}`);
      }

      const result = await processNotifyJob(job.data, store);

      if (result.skipped) {
        console.log(
          `[notify] Skipped ${result.notificationId || "(none)"}: ${result.skipped}`,
        );
        return result;
      }

      console.log(
        `[notify] Delivered ${result.notificationId} (${job.data.type})`,
      );
      return result;
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, error) => {
    const type = job?.data.type ?? "unknown";
    const jobId = job?.data.payload.jobId ?? "unknown";
    console.error(`[notify] Failed for ${type}/${jobId}:`, error);
  });

  return {
    worker,
    async close() {
      await worker.close();
    },
  };
}
