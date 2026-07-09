import { Worker, type ConnectionOptions } from "bullmq";

import type { MatchQueue } from "../ai-jobs";
import type { NotifyQueue, WatchlistNotifyStore } from "../notifications";
import { SYNC_JOB_NAME } from "../scheduler";
import { processSyncCompany, type SyncCompanyStore } from "./processor";

export const SYNC_QUEUE_NAME = "company-sync";

export interface SyncCompanyJobData {
  companyId: string;
}

export interface SyncWorkerHandle {
  worker: Worker<SyncCompanyJobData>;
  close(): Promise<void>;
}

export interface CreateSyncWorkerDeps {
  matchQueue: MatchQueue;
  notifyQueue: NotifyQueue;
  notifyStore: WatchlistNotifyStore;
}

/**
 * BullMQ worker that processes one company sync per job.
 * Failures are isolated — one company's error does not block others.
 */
export function createSyncWorker(
  connection: ConnectionOptions,
  store: SyncCompanyStore,
  deps: CreateSyncWorkerDeps,
): SyncWorkerHandle {
  const worker = new Worker<SyncCompanyJobData>(
    SYNC_QUEUE_NAME,
    async (job) => {
      if (job.name !== SYNC_JOB_NAME) {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      const result = await processSyncCompany(job.data.companyId, store, {
        matchQueue: deps.matchQueue,
        notifyQueue: deps.notifyQueue,
        notifyStore: deps.notifyStore,
      });
      console.log(
        `[sync-company] ${result.companyId} (${result.platform}): ` +
          `${result.jobsFound} found, ${result.jobsNew} new, ${result.jobsUpdated} updated`,
      );
      return result;
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, error) => {
    const companyId = job?.data.companyId ?? "unknown";
    console.error(`[sync-company] Failed for ${companyId}:`, error);
  });

  return {
    worker,
    async close() {
      await worker.close();
    },
  };
}
