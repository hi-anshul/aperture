import type { NormalizedJob } from "@aperture/shared";

import type { DedupedJob } from "../dedupe-engine";

export interface JobWriteClient {
  job: {
    create(args: { data: JobCreateData }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: Partial<JobUpdateData>;
    }): Promise<{ id: string }>;
  };
}

export interface JobCreateData {
  id: string;
  externalId: string;
  companyId: string;
  title: string;
  description: string;
  location: string | null;
  workMode: string | null;
  country: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  visaSponsorship: boolean | null;
  tags: string[];
  sourceUrl: string;
  sourcePlatform: string;
  postedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  isActive: boolean;
}

export type JobUpdateData = Omit<JobCreateData, "id" | "firstSeenAt">;

export interface WriteJobsResult {
  inserted: number;
  updated: number;
  deactivated: number;
}

function toCreateData(job: NormalizedJob): JobCreateData {
  return {
    id: job.id,
    externalId: job.externalId,
    companyId: job.companyId,
    title: job.title,
    description: job.description,
    location: job.location,
    workMode: job.workMode,
    country: job.country,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    visaSponsorship: job.visaSponsorship,
    tags: job.tags,
    sourceUrl: job.sourceUrl,
    sourcePlatform: job.sourcePlatform,
    postedAt: job.postedAt,
    firstSeenAt: job.firstSeenAt,
    lastSeenAt: job.lastSeenAt,
    isActive: job.isActive,
  };
}

function toUpdateData(job: NormalizedJob): JobUpdateData {
  const data = toCreateData(job);
  const { id: _id, firstSeenAt: _firstSeenAt, ...updateData } = data;
  return updateData;
}

export async function writeDedupedJobs(
  client: JobWriteClient,
  deduped: DedupedJob[],
): Promise<WriteJobsResult> {
  let inserted = 0;
  let updated = 0;
  let deactivated = 0;

  for (const entry of deduped) {
    if (entry.action === "deactivate") {
      await client.job.update({
        where: { id: entry.job.id },
        data: { isActive: false },
      });
      deactivated += 1;
      continue;
    }

    if (entry.action === "insert") {
      await client.job.create({ data: toCreateData(entry.job) });
      inserted += 1;
      continue;
    }

    await client.job.update({
      where: { id: entry.job.id },
      data: toUpdateData(entry.job),
    });
    updated += 1;
  }

  return { inserted, updated, deactivated };
}
