import type { Company, PlatformType } from "@aperture/shared";
import {
  createDefaultRegistry,
  detectAndPersistPlatform,
  type PlatformPersistenceClient,
} from "@aperture/connectors";

import { createDedupeEngine } from "../dedupe-engine";
import type { MatchQueue } from "../ai-jobs";
import {
  applyJobChanges,
  computeJobDiff,
  handoffJobDiff,
  type ExistingJobForDiff,
} from "../change-detection";
import { FetchError } from "../fetch-engine";
import type { NotifyQueue, WatchlistNotifyStore } from "../notifications";
import { createNormalizerEngine } from "../normalizer";
import { ParserError } from "../parser-engine";
import { type JobWriteClient } from "./write-jobs";

export interface ProcessSyncCompanyDeps {
  matchQueue: MatchQueue;
  notifyQueue: NotifyQueue;
  notifyStore: WatchlistNotifyStore;
}

export interface SyncCompanyRecord {
  id: string;
  name: string;
  careersUrl: string;
  platform: string;
  logoUrl: string | null;
}

export interface SyncCompanyStore extends PlatformPersistenceClient, JobWriteClient {
  $transaction<T>(
    fn: (tx: Omit<SyncCompanyStore, "$transaction">) => Promise<T>,
  ): Promise<T>;
  company: PlatformPersistenceClient["company"] & {
    findUnique(args: {
      where: { id: string };
    }): Promise<SyncCompanyRecord | null>;
  };
  job: JobWriteClient["job"] & {
    findMany(args: {
      where: { companyId: string };
      select: {
        id: true;
        companyId: true;
        externalId: true;
        title: true;
        location: true;
        salaryMin: true;
        salaryMax: true;
        salaryCurrency: true;
        firstSeenAt: true;
        isActive: true;
      };
    }): Promise<
      Array<{
        id: string;
        companyId: string;
        externalId: string;
        title: string;
        location: string | null;
        salaryMin: number | null;
        salaryMax: number | null;
        salaryCurrency: string | null;
        firstSeenAt: Date;
        isActive: boolean;
      }>
    >;
    update(args: {
      where: { id: string };
      data: { isActive: false };
    }): Promise<unknown>;
  };
  jobSource: {
    findFirst(args: {
      where: { companyId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        companyId: string;
        url: string;
        platform: string;
        lastFetchAt: Date;
        lastStatus: string;
      };
    }): Promise<unknown>;
    update(args: {
      where: { id: string };
      data: {
        platform: string;
        lastFetchAt: Date;
        lastStatus: string;
      };
    }): Promise<unknown>;
  };
  syncHistory: {
    create(args: {
      data: {
        companyId: string;
        status: string;
      };
    }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: {
        finishedAt?: Date;
        status?: string;
        jobsFound?: number;
        jobsNew?: number;
        jobsRemoved?: number;
        errorMessage?: string | null;
      };
    }): Promise<unknown>;
  };
}

export interface SyncCompanyResult {
  companyId: string;
  platform: PlatformType;
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
}

export function toSyncHistoryError(error: unknown): string {
  if (error instanceof FetchError || error instanceof ParserError) {
    return error.toSyncHistoryMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Runs fetch → normalize → dedupe → change detection for one company and writes results to the DB.
 * Platform detection and connector resolution happen before fetch.
 */
export async function processSyncCompany(
  companyId: string,
  store: SyncCompanyStore,
  deps: ProcessSyncCompanyDeps,
): Promise<SyncCompanyResult> {
  const syncRecord = await store.syncHistory.create({
    data: {
      companyId,
      status: "running",
    },
  });

  try {
    const company = await store.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const platform = await detectAndPersistPlatform(companyId, store);
    const registry = createDefaultRegistry();
    const connector = await registry.resolve(company.careersUrl);

    if (!connector) {
      throw new Error(
        `No connector registered for careers URL: ${company.careersUrl}`,
      );
    }

    const companyDto: Company = {
      id: company.id,
      name: company.name,
      careersUrl: company.careersUrl,
      platform,
      logoUrl: company.logoUrl,
    };

    const syncedAt = new Date();
    const rawJobs = await connector.fetch(companyDto);

    const normalizer = createNormalizerEngine();
    const normalized = normalizer.normalizeMany(rawJobs, {
      companyId,
      syncedAt,
    });

    const existingJobs = await store.job.findMany({
      where: { companyId },
      select: {
        id: true,
        companyId: true,
        externalId: true,
        title: true,
        location: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        firstSeenAt: true,
        isActive: true,
      },
    });

    const existingForDiff: ExistingJobForDiff[] = existingJobs.map((job) => ({
      id: job.id,
      companyId: job.companyId,
      externalId: job.externalId,
      title: job.title,
      location: job.location,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      isActive: job.isActive,
    }));

    const dedupeEngine = createDedupeEngine();
    const deduped = dedupeEngine.dedupe(normalized, {
      companyId,
      companyName: company.name,
      syncedAt,
      existingJobs,
    });

    const diff = computeJobDiff(companyId, deduped.jobs, existingForDiff);

    await store.$transaction(async (tx) => {
      await tx.syncHistory.update({
        where: { id: syncRecord.id },
        data: {
          jobsFound: normalized.length,
          jobsNew: diff.newJobs.length,
          jobsRemoved: diff.removedJobIds.length,
        },
      });

      await applyJobChanges(
        tx,
        deduped.jobs,
        diff,
        existingForDiff,
      );

      const existingSource = await tx.jobSource.findFirst({
        where: { companyId },
        select: { id: true },
      });

      if (existingSource) {
        await tx.jobSource.update({
          where: { id: existingSource.id },
          data: {
            platform,
            lastFetchAt: syncedAt,
            lastStatus: "success",
          },
        });
      } else {
        await tx.jobSource.create({
          data: {
            companyId,
            url: company.careersUrl,
            platform,
            lastFetchAt: syncedAt,
            lastStatus: "success",
          },
        });
      }

      await tx.syncHistory.update({
        where: { id: syncRecord.id },
        data: {
          finishedAt: new Date(),
          status: "success",
          jobsFound: normalized.length,
          jobsNew: diff.newJobs.length,
          jobsRemoved: diff.removedJobIds.length,
          errorMessage: null,
        },
      });
    });

    await handoffJobDiff(diff, {
      matchQueue: deps.matchQueue,
      notifyQueue: deps.notifyQueue,
      notifyStore: deps.notifyStore,
    });

    return {
      companyId,
      platform,
      jobsFound: normalized.length,
      jobsNew: diff.newJobs.length,
      jobsUpdated: diff.updatedJobs.length,
    };
  } catch (error) {
    await store.syncHistory.update({
      where: { id: syncRecord.id },
      data: {
        finishedAt: new Date(),
        status: "failed",
        errorMessage: toSyncHistoryError(error),
      },
    });

    throw error;
  }
}
