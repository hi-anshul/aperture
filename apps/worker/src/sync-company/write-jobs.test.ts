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
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({ id: "job-existing" });
    const client = { job: { create, createMany, update } };

    const result = await writeDedupedJobs(client, [
      { action: "insert", job: buildJob({ id: "job-new" }) },
      { action: "update", job: buildJob({ id: "job-existing", title: "Updated" }) },
    ]);

    expect(result).toEqual({ inserted: 1, updated: 1, deactivated: 0 });
    expect(createMany).toHaveBeenCalledOnce();
    expect(createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id: "job-new" })],
      skipDuplicates: true,
    });
    expect(update).toHaveBeenCalledOnce();
  });

  it("batches large insert sets with createMany", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 50 });
    const update = vi.fn();
    const client = {
      job: {
        create: vi.fn(),
        createMany,
        update,
      },
    };

    const inserts = Array.from({ length: 55 }, (_, index) => ({
      action: "insert" as const,
      job: buildJob({
        id: `job-${index}`,
        externalId: `ext-${index}`,
      }),
    }));

    const result = await writeDedupedJobs(client, inserts);

    expect(result.inserted).toBe(55);
    expect(createMany).toHaveBeenCalledTimes(2);
    expect(createMany.mock.calls[0]?.[0].data).toHaveLength(50);
    expect(createMany.mock.calls[1]?.[0].data).toHaveLength(5);
  });
});
