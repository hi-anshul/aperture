import { describe, expect, it, vi } from "vitest";

import type { JobDiff, NormalizedJob } from "@aperture/shared";

import type { DedupedJob } from "../dedupe-engine";
import { applyJobChanges } from "./apply-changes";
import type { ExistingJobForDiff } from "./types";

describe("applyJobChanges", () => {
  it("writes deduped jobs and soft-deletes removed postings", async () => {
    const create = vi.fn().mockResolvedValue({ id: "job-new" });
    const update = vi.fn().mockResolvedValue({ id: "job-existing" });
    const client = { job: { create, update } };

    const deduped: DedupedJob[] = [
      {
        action: "insert",
        job: {
          id: "job-new",
          externalId: "ext-new",
          sourcePlatform: "greenhouse",
          sourceUrl: "https://example.com/jobs/new",
          companyId: "company-1",
          title: "New Role",
          description: "New",
          location: "Remote",
          workMode: "remote",
          country: "US",
          employmentType: "full-time",
          salaryMin: null,
          salaryMax: null,
          salaryCurrency: null,
          visaSponsorship: null,
          tags: [],
          postedAt: null,
          firstSeenAt: new Date("2026-07-08T12:00:00.000Z"),
          lastSeenAt: new Date("2026-07-08T12:00:00.000Z"),
          isActive: true,
        },
      },
      {
        action: "deactivate",
        job: {
          id: "job-removed",
          externalId: "ext-removed",
          companyId: "company-1",
          title: "Removed Role",
          location: null,
          firstSeenAt: new Date("2026-07-01T12:00:00.000Z"),
          lastSeenAt: new Date("2026-07-08T12:00:00.000Z"),
          isActive: false,
        },
      },
    ];

    const diff: JobDiff = {
      companyId: "company-1",
      newJobs: [deduped[0]!.job as NormalizedJob],
      removedJobIds: ["job-removed"],
      updatedJobs: [],
    };

    const existingJobs: ExistingJobForDiff[] = [];

    const result = await applyJobChanges(client, deduped, diff, existingJobs);

    expect(result).toEqual({ inserted: 1, updated: 0, deactivated: 1 });
    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({
      where: { id: "job-removed" },
      data: { isActive: false },
    });
  });

  it("reactivates jobs that reappear after being removed", async () => {
    const create = vi.fn();
    const update = vi.fn().mockResolvedValue({ id: "job-1" });
    const client = { job: { create, update } };

    const deduped: DedupedJob[] = [
      {
        action: "update",
        job: {
          id: "job-1",
          externalId: "ext-1",
          sourcePlatform: "greenhouse",
          sourceUrl: "https://example.com/jobs/1",
          companyId: "company-1",
          title: "Software Engineer",
          description: "Build",
          location: "Remote",
          workMode: "remote",
          country: "US",
          employmentType: "full-time",
          salaryMin: null,
          salaryMax: null,
          salaryCurrency: null,
          visaSponsorship: null,
          tags: [],
          postedAt: null,
          firstSeenAt: new Date("2026-07-01T12:00:00.000Z"),
          lastSeenAt: new Date("2026-07-08T12:00:00.000Z"),
          isActive: false,
        },
      },
    ];

    const diff: JobDiff = {
      companyId: "company-1",
      newJobs: [],
      removedJobIds: [],
      updatedJobs: [deduped[0]!.job as NormalizedJob],
    };

    const existingJobs: ExistingJobForDiff[] = [
      {
        id: "job-1",
        companyId: "company-1",
        externalId: "ext-1",
        title: "Software Engineer",
        location: "Remote",
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        isActive: false,
      },
    ];

    await applyJobChanges(client, deduped, diff, existingJobs);

    expect(update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({ isActive: true }),
    });
  });
});
