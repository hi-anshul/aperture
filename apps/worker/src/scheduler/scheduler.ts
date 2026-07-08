import type { Queue } from "bullmq";

import { getSchedulerConfig } from "./config";
import { runScheduledSync, type CompanyStore } from "./run-scheduled-sync";

export interface SchedulerHandle {
  stop(): void;
}

/**
 * Starts the recurring poll loop. Runs once immediately, then on each interval.
 * Companies added mid-cycle are picked up on the next run without a restart.
 */
export function startScheduler(
  queue: Queue,
  store: CompanyStore,
): SchedulerHandle {
  const { intervalMs } = getSchedulerConfig();

  const tick = async () => {
    try {
      const { enqueued } = await runScheduledSync(queue, store);
      console.log(
        `[scheduler] Enqueued ${enqueued} sync job(s) (interval ${intervalMs}ms)`,
      );
    } catch (error) {
      console.error("[scheduler] Failed to enqueue sync jobs:", error);
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  return {
    stop() {
      clearInterval(timer);
    },
  };
}
