/** BullMQ queue name for notification dispatch. */
export const NOTIFY_QUEUE_NAME = "notify";

/** BullMQ job name for a single notification delivery task. */
export const NOTIFY_JOB_NAME = "dispatch-notification";

export type NotificationChannel = "email" | "push" | "telegram";

export type NotificationType = "new-job" | "high-match" | "dream-company";

export const DEFAULT_NOTIFICATION_CHANNEL: NotificationChannel = "telegram";
export const DEFAULT_MATCH_SCORE_THRESHOLD = 80;

export interface NotificationPayload {
  jobId: string;
  companyId: string;
  companyName: string;
  title: string;
  sourceUrl: string;
  matchScore?: number;
}

export interface NotifyJobQueueData {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
  /** Preferred channel at enqueue time; processor re-reads user prefs before send. */
  channel: NotificationChannel;
}
