import { Queue } from "bullmq";
import {
  AI_MATCH_JOB_NAME,
  AI_MATCH_QUEUE_NAME,
  type MatchJobQueueData,
} from "@aperture/shared";

let matchQueue: Queue<MatchJobQueueData> | null = null;

function getRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    throw new Error(
      "REDIS_URL is required to enqueue AI match jobs — set your Upstash Redis TLS URL in .env",
    );
  }
  return redisUrl;
}

export function getMatchQueue(): Queue<MatchJobQueueData> {
  if (!matchQueue) {
    matchQueue = new Queue<MatchJobQueueData>(AI_MATCH_QUEUE_NAME, {
      connection: {
        url: getRedisUrl(),
        maxRetriesPerRequest: null,
      },
    });
  }
  return matchQueue;
}

/** Enqueues a single on-demand re-score. Matching runs in the worker, not here. */
export async function enqueueJobRescore(
  data: MatchJobQueueData,
): Promise<void> {
  const queue = getMatchQueue();
  await queue.add(AI_MATCH_JOB_NAME, data, {
    jobId: `match:${data.jobId}:${Date.now()}`,
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
  });
}
