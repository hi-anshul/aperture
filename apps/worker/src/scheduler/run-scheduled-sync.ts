import type { Queue } from "bullmq";

import { SYNC_JOB_NAME } from "./config";

export interface CompanyRef {
  id: string;
}

export interface CompanyStore {
  findMany(): Promise<CompanyRef[]>;
}

/**
 * Enqueues one `sync-company` job for a single company.
 * Used by the recurring scheduler and future manual "sync now" triggers.
 */
export async function enqueueCompanySync(
  queue: Queue,
  companyId: string,
): Promise<void> {
  await queue.add(
    SYNC_JOB_NAME,
    { companyId },
    {
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
}

/**
 * Enumerates all tracked companies and enqueues one sync job per company.
 * See `aperture-spec.md` §9.
 */
export async function runScheduledSync(
  queue: Queue,
  store: CompanyStore,
): Promise<{ enqueued: number }> {
  const companies = await store.findMany();

  for (const company of companies) {
    await enqueueCompanySync(queue, company.id);
  }

  return { enqueued: companies.length };
}
