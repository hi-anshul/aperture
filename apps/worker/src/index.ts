import "./load-env";

import { Queue } from "bullmq";
import { prisma } from "@aperture/db";

import { startScheduler } from "./scheduler";
import { createSyncWorker, SYNC_QUEUE_NAME, type SyncCompanyStore } from "./sync-company";

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

async function main() {
  const syncQueue = createSyncQueue();
  const syncWorker = createSyncWorker(connection, prisma as unknown as SyncCompanyStore);
  const scheduler = startScheduler(syncQueue, {
    findMany: () => prisma.company.findMany({ select: { id: true } }),
  });

  console.log("[worker] Aperture worker starting…");
  console.log(`[worker] Redis: ${formatRedisLogContext(resolvedRedisUrl)}`);

  const shutdown = async () => {
    scheduler.stop();
    await syncWorker.close();
    await syncQueue.close();
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
