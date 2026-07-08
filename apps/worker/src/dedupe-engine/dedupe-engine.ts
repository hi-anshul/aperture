import type { NormalizedJob } from "@aperture/shared";

import {
  buildExternalIdKey,
  buildFuzzyKey,
} from "./match-keys";
import type {
  DedupeContext,
  DedupeMatchType,
  DedupedJob,
  DedupeResult,
  ExistingJobSnapshot,
} from "./types";

export class DedupeEngine {
  dedupe(incoming: NormalizedJob[], context: DedupeContext): DedupeResult {
    const existingByExternalId = new Map<string, ExistingJobSnapshot>();
    const existingByFuzzyKey = new Map<string, ExistingJobSnapshot>();

    for (const existing of context.existingJobs) {
      if (existing.companyId !== context.companyId) {
        continue;
      }

      existingByExternalId.set(
        buildExternalIdKey(existing.companyId, existing.externalId),
        existing,
      );

      const fuzzyKey = buildFuzzyKey(
        context.companyId,
        context.companyName,
        existing.title,
        existing.location,
      );
      if (!existingByFuzzyKey.has(fuzzyKey)) {
        existingByFuzzyKey.set(fuzzyKey, existing);
      }
    }

    const results: DedupedJob[] = [];
    const seenExternalIds = new Set<string>();
    const seenFuzzyKeys = new Set<string>();
    const matchedExistingIds = new Set<string>();

    for (const job of incoming) {
      if (job.companyId !== context.companyId) {
        throw new Error(
          `Incoming job companyId "${job.companyId}" does not match dedupe context companyId "${context.companyId}"`,
        );
      }

      const externalKey = buildExternalIdKey(job.companyId, job.externalId);
      const fuzzyKey = buildFuzzyKey(
        context.companyId,
        context.companyName,
        job.title,
        job.location,
      );

      if (seenExternalIds.has(externalKey)) {
        continue;
      }

      const existingByExternal = existingByExternalId.get(externalKey);
      if (existingByExternal) {
        seenExternalIds.add(externalKey);
        seenFuzzyKeys.add(fuzzyKey);
        matchedExistingIds.add(existingByExternal.id);
        results.push(
          this.toUpdate(job, existingByExternal, context, "externalId"),
        );
        continue;
      }

      if (seenFuzzyKeys.has(fuzzyKey)) {
        seenExternalIds.add(externalKey);
        continue;
      }

      const existingByFuzzy = existingByFuzzyKey.get(fuzzyKey);
      if (existingByFuzzy) {
        seenExternalIds.add(externalKey);
        seenFuzzyKeys.add(fuzzyKey);
        matchedExistingIds.add(existingByFuzzy.id);
        results.push(this.toUpdate(job, existingByFuzzy, context, "fuzzy"));
        continue;
      }

      seenExternalIds.add(externalKey);
      seenFuzzyKeys.add(fuzzyKey);
      results.push({
        job: {
          ...job,
          lastSeenAt: context.syncedAt,
        },
        action: "insert",
      });
    }

    for (const existing of context.existingJobs) {
      if (existing.companyId !== context.companyId) {
        continue;
      }

      if (matchedExistingIds.has(existing.id) || !existing.isActive) {
        continue;
      }

      results.push(this.toDeactivate(existing, context));
    }

    return { jobs: results };
  }

  private toUpdate(
    incoming: NormalizedJob,
    existing: ExistingJobSnapshot,
    context: DedupeContext,
    matchType: DedupeMatchType,
  ): DedupedJob {
    return {
      job: {
        ...incoming,
        id: existing.id,
        externalId: existing.externalId,
        firstSeenAt: existing.firstSeenAt,
        lastSeenAt: context.syncedAt,
        isActive: incoming.isActive,
      },
      action: "update",
      matchType,
    };
  }

  private toDeactivate(
    existing: ExistingJobSnapshot,
    context: DedupeContext,
  ): DedupedJob {
    return {
      job: {
        id: existing.id,
        externalId: existing.externalId,
        companyId: existing.companyId,
        title: existing.title,
        location: existing.location,
        firstSeenAt: existing.firstSeenAt,
        lastSeenAt: context.syncedAt,
        isActive: false,
      },
      action: "deactivate",
    };
  }
}

export function createDedupeEngine(): DedupeEngine {
  return new DedupeEngine();
}
