/** BullMQ queue name for AI resume ↔ job matching. */
export const AI_MATCH_QUEUE_NAME = "ai-match";

/** BullMQ job name for a single match/re-score task. */
export const AI_MATCH_JOB_NAME = "match-job";

export interface MatchJobQueueData {
  jobId: string;
  /** When set (manual re-score), prefer this resume; otherwise use active resume. */
  resumeId?: string;
  /** Optional user scope for multi-user later; MVP may omit. */
  userId?: string;
}
