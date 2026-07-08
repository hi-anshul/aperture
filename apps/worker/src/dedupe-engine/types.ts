import type { NormalizedJob } from "@aperture/shared";

/** Minimal job fields loaded from the DB for dedupe matching */
export interface ExistingJobSnapshot {
  id: string;
  companyId: string;
  externalId: string;
  title: string;
  location: string | null;
  firstSeenAt: Date;
  isActive: boolean;
}

export interface DeactivateJobPayload {
  id: string;
  externalId: string;
  companyId: string;
  title: string;
  location: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  isActive: false;
}

export interface DedupeContext {
  companyId: string;
  companyName: string;
  syncedAt: Date;
  existingJobs: ExistingJobSnapshot[];
}

export type DedupeMatchType = "externalId" | "fuzzy";
export type DedupeAction = "insert" | "update" | "deactivate";

export type DedupedJob =
  | {
      job: NormalizedJob;
      action: "insert" | "update";
      matchType?: DedupeMatchType;
    }
  | {
      job: DeactivateJobPayload;
      action: "deactivate";
    };

export interface DedupeResult {
  jobs: DedupedJob[];
}
