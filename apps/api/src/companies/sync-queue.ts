import { Queue } from "bullmq";
import {
  SYNC_JOB_NAME,
  SYNC_QUEUE_NAME,
  type SyncCompanyJobData,
} from "@aperture/shared";

let syncQueue: Queue<SyncCompanyJobData> | null = null;

function getRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error(
      "REDIS_URL is required to enqueue sync jobs — set your Upstash Redis TLS URL in .env",
    );
  }
  return redisUrl;
}

export function getSyncQueue(): Queue<SyncCompanyJobData> {
  if (!syncQueue) {
    syncQueue = new Queue<SyncCompanyJobData>(SYNC_QUEUE_NAME, {
      connection: {
        url: getRedisUrl(),
        maxRetriesPerRequest: null,
      },
    });
  }
  return syncQueue;
}

/** Enqueues one company sync. Fetch/parse runs in the worker, not here. */
export async function enqueueCompanySync(companyId: string): Promise<void> {
  const queue = getSyncQueue();
  await queue.add(
    SYNC_JOB_NAME,
    { companyId },
    {
      jobId: `sync-${companyId}-${Date.now()}`,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
    },
  );
}
