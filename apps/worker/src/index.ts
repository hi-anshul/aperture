import { Queue } from "bullmq";
import { startSchedulerStub } from "./scheduler";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required — set your Upstash Redis TLS URL in .env");
}

export function createSyncQueue(): Queue {
  return new Queue("company-sync", {
    connection: { url: redisUrl, maxRetriesPerRequest: null },
  });
}

async function main() {
  const syncQueue = createSyncQueue();

  console.log("[worker] Aperture worker starting…");
  console.log(`[worker] Redis: ${redisUrl}`);

  startSchedulerStub(syncQueue);

  process.on("SIGINT", async () => {
    await syncQueue.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
