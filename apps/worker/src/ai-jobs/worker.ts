import { Worker, type ConnectionOptions } from "bullmq";

import type {
  HighMatchNotifyStore,
  NotifyQueue,
} from "../notifications";
import {
  AI_MATCH_JOB_NAME,
  AI_MATCH_QUEUE_NAME,
  type MatchJobQueueData,
} from "./constants";
import { processMatchJob, type MatchJobStore } from "./processor";

export interface MatchWorkerHandle {
  worker: Worker<MatchJobQueueData>;
  close(): Promise<void>;
}

export interface CreateMatchWorkerDeps {
  notifyQueue: NotifyQueue;
  notifyStore: HighMatchNotifyStore;
}

/**
 * BullMQ worker that scores one job against the active resume per queue job.
 * Failures are isolated and retryable — never run matching inside HTTP handlers.
 */
export function createMatchWorker(
  connection: ConnectionOptions,
  store: MatchJobStore,
  deps: CreateMatchWorkerDeps,
): MatchWorkerHandle {
  const worker = new Worker<MatchJobQueueData>(
    AI_MATCH_QUEUE_NAME,
    async (job) => {
      if (job.name !== AI_MATCH_JOB_NAME) {
        throw new Error(`Unknown AI job name: ${job.name}`);
      }

      const result = await processMatchJob(job.data, store, {}, {
        notifyQueue: deps.notifyQueue,
        notifyStore: deps.notifyStore,
      });

      if (result.skipped) {
        console.log(
          `[ai-match] Skipped ${result.jobId}: ${result.skipped}`,
        );
        return result;
      }

      console.log(
        `[ai-match] ${result.jobId}: score=${result.score} verdict=${result.verdict}` +
          (result.highMatchNotified ? " (high-match notified)" : ""),
      );
      return result;
    },
    {
      connection,
      concurrency: 2,
    },
  );

  worker.on("failed", (job, error) => {
    const jobId = job?.data.jobId ?? "unknown";
    console.error(`[ai-match] Failed for ${jobId}:`, error);
  });

  return {
    worker,
    async close() {
      await worker.close();
    },
  };
}
