import type { NormalizedJob, RawJob } from "@aperture/shared";

export interface NormalizeContext {
  companyId: string;
  /** Existing DB job ID when re-normalizing a known record */
  jobId?: string;
  /** Timestamp used for lastSeenAt and default firstSeenAt */
  syncedAt?: Date;
  /** Preserve original firstSeenAt when updating an existing job */
  firstSeenAt?: Date;
  isActive?: boolean;
}

export interface NormalizeRequest {
  job: RawJob;
  context: NormalizeContext;
}

export interface NormalizeSuccess {
  job: NormalizedJob;
}
