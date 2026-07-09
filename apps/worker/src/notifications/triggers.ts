import type { Queue } from "bullmq";
import type { JobDiff, NotifyJobQueueData } from "@aperture/shared";
import {
  DEFAULT_MATCH_SCORE_THRESHOLD,
  DEFAULT_NOTIFICATION_CHANNEL,
  type NotificationChannel,
  type NotificationType,
} from "@aperture/shared";

import { enqueueNotifyJob, type NotifyQueue } from "./enqueue";

export type { NotifyQueue } from "./enqueue";
export { enqueueNotifyJob } from "./enqueue";

export interface WatchlistNotifyUser {
  id: string;
  notificationChannel: string;
  matchScoreThreshold: number;
}

export interface WatchlistNotifyStore {
  user: {
    findMany(args: {
      select: {
        id: true;
        notificationChannel: true;
        matchScoreThreshold: true;
      };
    }): Promise<WatchlistNotifyUser[]>;
  };
  watchlist: {
    findMany(args: {
      where: {
        companyId: string;
        notificationsEnabled: true;
      };
      select: { userId: true };
    }): Promise<Array<{ userId: string }>>;
  };
  company: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; name: true };
    }): Promise<{ id: string; name: string } | null>;
  };
}

function asChannel(value: string): NotificationChannel {
  if (value === "email" || value === "push" || value === "telegram") {
    return value;
  }
  return DEFAULT_NOTIFICATION_CHANNEL;
}

/**
 * Enqueues dream-company notifications for new postings at watchlisted companies
 * where the user has notifications enabled.
 */
export async function enqueueWatchlistNotificationsForDiff(
  queue: NotifyQueue,
  diff: JobDiff,
  store: WatchlistNotifyStore,
): Promise<number> {
  if (diff.newJobs.length === 0) {
    return 0;
  }

  const [users, watchlistRows, company] = await Promise.all([
    store.user.findMany({
      select: {
        id: true,
        notificationChannel: true,
        matchScoreThreshold: true,
      },
    }),
    store.watchlist.findMany({
      where: {
        companyId: diff.companyId,
        notificationsEnabled: true,
      },
      select: { userId: true },
    }),
    store.company.findUnique({
      where: { id: diff.companyId },
      select: { id: true, name: true },
    }),
  ]);

  if (!company || watchlistRows.length === 0 || users.length === 0) {
    return 0;
  }

  const usersById = new Map(users.map((user) => [user.id, user]));
  const recipientIds = watchlistRows
    .map((row) => row.userId)
    .filter((userId) => usersById.has(userId));

  if (recipientIds.length === 0) {
    return 0;
  }

  let enqueued = 0;

  for (const job of diff.newJobs) {
    for (const userId of recipientIds) {
      const user = usersById.get(userId)!;
      const data: NotifyJobQueueData = {
        userId,
        type: "dream-company" satisfies NotificationType,
        channel: asChannel(user.notificationChannel),
        payload: {
          jobId: job.id,
          companyId: company.id,
          companyName: company.name,
          title: job.title,
          sourceUrl: job.sourceUrl,
        },
      };

      await enqueueNotifyJob(queue, data, {
        jobId: `notify:dream-company:${userId}:${job.id}`,
      });
      enqueued += 1;
    }
  }

  return enqueued;
}

export interface HighMatchNotifyStore {
  user: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        notificationChannel: true;
        matchScoreThreshold: true;
      };
    }): Promise<WatchlistNotifyUser | null>;
  };
  job: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        title: true;
        sourceUrl: true;
        companyId: true;
        company: { select: { id: true; name: true } };
      };
    }): Promise<{
      id: string;
      title: string;
      sourceUrl: string;
      companyId: string;
      company: { id: string; name: string };
    } | null>;
  };
}

/**
 * Enqueues a high-match notification when score >= the user's threshold.
 * Independent of watchlist status.
 */
export async function enqueueHighMatchNotification(
  queue: NotifyQueue,
  args: {
    jobId: string;
    userId: string;
    score: number;
  },
  store: HighMatchNotifyStore,
): Promise<boolean> {
  const user = await store.user.findUnique({
    where: { id: args.userId },
    select: {
      id: true,
      notificationChannel: true,
      matchScoreThreshold: true,
    },
  });

  if (!user) {
    return false;
  }

  const threshold =
    typeof user.matchScoreThreshold === "number"
      ? user.matchScoreThreshold
      : DEFAULT_MATCH_SCORE_THRESHOLD;

  if (args.score < threshold) {
    return false;
  }

  const job = await store.job.findUnique({
    where: { id: args.jobId },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      companyId: true,
      company: { select: { id: true, name: true } },
    },
  });

  if (!job) {
    return false;
  }

  const data: NotifyJobQueueData = {
    userId: user.id,
    type: "high-match",
    channel: asChannel(user.notificationChannel),
    payload: {
      jobId: job.id,
      companyId: job.company.id,
      companyName: job.company.name,
      title: job.title,
      sourceUrl: job.sourceUrl,
      matchScore: args.score,
    },
  };

  await enqueueNotifyJob(queue, data, {
    jobId: `notify:high-match:${user.id}:${job.id}`,
  });

  return true;
}

/** Re-export Queue type helper for callers that only need add(). */
export type { Queue };
