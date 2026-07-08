import { describe, expect, it, vi } from "vitest";

import type { NormalizedJob } from "@aperture/shared";

import { writeDedupedJobs } from "./write-jobs";

function buildJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    id: "job-1",
    externalId: "ext-1",
    sourcePlatform: "greenhouse",
    sourceUrl: "https://boards.greenhouse.io/example/jobs/1",
    companyId: "company-1",
    title: "Product Manager",
    description: "Build products",
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
    isActive: true,
    ...overrides,
  };
}

describe("writeDedupedJobs", () => {
  it("creates inserts and updates existing rows", async () => {
    const create = vi.fn().mockResolvedValue({ id: "job-new" });
    const update = vi.fn().mockResolvedValue({ id: "job-existing" });
    const client = { job: { create, update } };

    const result = await writeDedupedJobs(client, [
      { action: "insert", job: buildJob({ id: "job-new" }) },
      { action: "update", job: buildJob({ id: "job-existing", title: "Updated" }) },
    ]);

    expect(result).toEqual({ inserted: 1, updated: 1, deactivated: 0 });
    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });
});
