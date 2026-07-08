const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export interface SchedulerConfig {
  intervalMs: number;
}

export function getSchedulerConfig(): SchedulerConfig {
  const raw = process.env.SCHEDULER_INTERVAL_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : FOUR_HOURS_MS;

  return {
    intervalMs: Number.isFinite(parsed) && parsed > 0 ? parsed : FOUR_HOURS_MS,
  };
}

export const SYNC_JOB_NAME = "sync-company";
