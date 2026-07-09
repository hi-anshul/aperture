import "./load-env";

import { Queue } from "bullmq";
import { prisma } from "@aperture/db";

import {
  AI_MATCH_QUEUE_NAME,
  createMatchWorker,
  type MatchJobQueueData,
  type MatchJobStore,
} from "./ai-jobs";
import {
  NOTIFY_QUEUE_NAME,
  createNotifyWorker,
  type HighMatchNotifyStore,
  type NotifyJobQueueData,
  type NotifyJobStore,
  type WatchlistNotifyStore,
} from "./notifications";
import { startScheduler } from "./scheduler";
import {
  createSyncWorker,
  SYNC_QUEUE_NAME,
  type SyncCompanyStore,
} from "./sync-company";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required — set your Upstash Redis TLS URL in .env");
}

const resolvedRedisUrl: string = redisUrl;
const connection = { url: resolvedRedisUrl, maxRetriesPerRequest: null };

function formatRedisLogContext(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? `:${parsed.port}` : "";
    const auth = parsed.username || parsed.password ? " (authenticated)" : "";
    return `${parsed.hostname}${port}${auth}`;
  } catch {
    return "(invalid URL)";
  }
}

export function createSyncQueue(): Queue {
  return new Queue(SYNC_QUEUE_NAME, { connection });
}

export function createMatchQueue(): Queue<MatchJobQueueData> {
  return new Queue<MatchJobQueueData>(AI_MATCH_QUEUE_NAME, { connection });
}

export function createNotifyQueue(): Queue<NotifyJobQueueData> {
  return new Queue<NotifyJobQueueData>(NOTIFY_QUEUE_NAME, { connection });
}

async function main() {
  const syncQueue = createSyncQueue();
  const matchQueue = createMatchQueue();
  const notifyQueue = createNotifyQueue();

  const notifyStore = prisma as unknown as WatchlistNotifyStore &
    HighMatchNotifyStore &
    NotifyJobStore;

  const syncWorker = createSyncWorker(
    connection,
    prisma as unknown as SyncCompanyStore,
    {
      matchQueue,
      notifyQueue,
      notifyStore,
    },
  );
  const matchWorker = createMatchWorker(
    connection,
    prisma as unknown as MatchJobStore,
    {
      notifyQueue,
      notifyStore,
    },
  );
  const notifyWorker = createNotifyWorker(connection, notifyStore);
  const scheduler = startScheduler(syncQueue, {
    findMany: () => prisma.company.findMany({ select: { id: true } }),
  });

  console.log("[worker] Aperture worker starting…");
  console.log(`[worker] Redis: ${formatRedisLogContext(resolvedRedisUrl)}`);
  console.log(
    `[worker] Queues: ${SYNC_QUEUE_NAME}, ${AI_MATCH_QUEUE_NAME}, ${NOTIFY_QUEUE_NAME}`,
  );

  const shutdown = async () => {
    scheduler.stop();
    await syncWorker.close();
    await matchWorker.close();
    await notifyWorker.close();
    await syncQueue.close();
    await matchQueue.close();
    await notifyQueue.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
