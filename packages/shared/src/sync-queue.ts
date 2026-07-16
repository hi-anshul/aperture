/** BullMQ queue name for per-company careers sync. */
export const SYNC_QUEUE_NAME = "company-sync";

/** BullMQ job name for syncing one company. */
export const SYNC_JOB_NAME = "sync-company";

export interface SyncCompanyJobData {
  companyId: string;
}
