import type { JobDiff } from "@aperture/shared";

import { isEmptyDiff } from "./change-detection";

/**
 * Hands a computed diff to downstream pipelines.
 * Phase 17 (AI matching) and Phase 18 (notifications) will consume this hook.
 */
export async function handoffJobDiff(diff: JobDiff): Promise<void> {
  if (isEmptyDiff(diff)) {
    return;
  }

  // Stub: enqueue AI matching for diff.newJobs (Phase 17)
  // Stub: enqueue notifications for diff.newJobs and diff.updatedJobs (Phase 18)
}
