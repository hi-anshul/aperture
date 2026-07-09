import type { JobDiff } from "@aperture/shared";

import {
  enqueueMatchJobsForDiff,
  type MatchQueue,
} from "../ai-jobs";
import {
  enqueueWatchlistNotificationsForDiff,
  type NotifyQueue,
  type WatchlistNotifyStore,
} from "../notifications";
import { isEmptyDiff } from "./change-detection";

export interface JobDiffHandoffDeps {
  matchQueue: MatchQueue;
  notifyQueue: NotifyQueue;
  notifyStore: WatchlistNotifyStore;
}

/**
 * Hands a computed diff to downstream pipelines.
 * Phase 17: enqueues AI matching for each new posting.
 * Phase 18: enqueues watchlist (dream-company) notifications for new postings.
 */
export async function handoffJobDiff(
  diff: JobDiff,
  deps: JobDiffHandoffDeps,
): Promise<void> {
  if (isEmptyDiff(diff)) {
    return;
  }

  if (diff.newJobs.length > 0) {
    const enqueued = await enqueueMatchJobsForDiff(deps.matchQueue, diff);
    console.log(
      `[change-detection] Enqueued ${enqueued} AI match job(s) for company ${diff.companyId}`,
    );

    const notified = await enqueueWatchlistNotificationsForDiff(
      deps.notifyQueue,
      diff,
      deps.notifyStore,
    );
    console.log(
      `[change-detection] Enqueued ${notified} watchlist notification(s) for company ${diff.companyId}`,
    );
  }
}
