import type { Queue } from "bullmq";

/**
 * Empty scheduler stub — recurring poll loop implemented in Phase 10.
 */
export function startSchedulerStub(_syncQueue: Queue): void {
  console.log("[scheduler] Stub ready — no jobs scheduled yet (Phase 10)");
}
