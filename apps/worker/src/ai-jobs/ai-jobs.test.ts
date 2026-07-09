import { describe, expect, it, vi } from "vitest";

import { enqueueMatchJob, enqueueMatchJobsForDiff } from "./enqueue";
import { processMatchJob, type MatchJobStore } from "./processor";
import type { MatchJobQueueData } from "./constants";
import type { JobDiff } from "@aperture/shared";

function makeJob(overrides: Partial<JobDiff["newJobs"][number]> = {}) {
  return {
    id: "job-1",
    externalId: "ext-1",
    sourcePlatform: "greenhouse" as const,
    sourceUrl: "https://example.com/jobs/1",
    companyId: "co-1",
    title: "Product Manager",
    description: "Own the roadmap.",
    location: "Remote",
    workMode: "remote" as const,
    country: "US",
    employmentType: "full-time" as const,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    visaSponsorship: null,
    tags: ["product"],
    postedAt: null,
    firstSeenAt: new Date("2026-01-01"),
    lastSeenAt: new Date("2026-01-01"),
    isActive: true,
    ...overrides,
  };
}

describe("enqueueMatchJobsForDiff", () => {
  it("enqueues one queue job per new posting", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const diff: JobDiff = {
      companyId: "co-1",
      newJobs: [makeJob({ id: "a" }), makeJob({ id: "b", externalId: "ext-2" })],
      removedJobIds: [],
      updatedJobs: [],
    };

    const count = await enqueueMatchJobsForDiff({ add }, diff);

    expect(count).toBe(2);
    expect(add).toHaveBeenCalledTimes(2);
    expect(add.mock.calls[0]?.[1]).toEqual({ jobId: "a" });
    expect(add.mock.calls[1]?.[1]).toEqual({ jobId: "b" });
  });

  it("skips empty newJobs", async () => {
    const add = vi.fn();
    const count = await enqueueMatchJobsForDiff(
      { add },
      {
        companyId: "co-1",
        newJobs: [],
        removedJobIds: ["x"],
        updatedJobs: [],
      },
    );
    expect(count).toBe(0);
    expect(add).not.toHaveBeenCalled();
  });
});

describe("enqueueMatchJob", () => {
  it("enqueues a single on-demand re-score", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    await enqueueMatchJob({ add }, { jobId: "job-9", userId: "user-1" });
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0]?.[1]).toEqual({
      jobId: "job-9",
      userId: "user-1",
    });
  });
});

describe("processMatchJob", () => {
  function createStore(overrides: {
    job?: Awaited<ReturnType<MatchJobStore["job"]["findUnique"]>>;
    resume?: Awaited<ReturnType<MatchJobStore["resume"]["findFirst"]>>;
  } = {}): MatchJobStore & { updates: unknown[] } {
    const updates: unknown[] = [];
    const defaultJob = {
      id: "job-1",
      title: "Product Manager",
      description: "Own the roadmap and ship features.",
      location: "Remote",
      tags: ["product"],
      isActive: true,
    };

    const job =
      overrides.job === undefined ? defaultJob : overrides.job;

    const resume =
      overrides.resume === undefined
        ? {
            id: "resume-1",
            userId: "user-1",
            skills: ["Product Strategy"],
            experience: [],
            education: [],
            keywords: ["B2B"],
          }
        : overrides.resume;

    return {
      updates,
      job: {
        findUnique: async () => job,
        update: async (args) => {
          updates.push(args.data);
          return { id: args.where.id };
        },
      },
      resume: {
        findFirst: async () => resume,
        findUnique: async () => resume,
      },
      user: {
        findFirst: async () => ({ id: "user-1" }),
      },
    };
  }

  it("persists a validated match result", async () => {
    const store = createStore();
    const result = await processMatchJob(
      { jobId: "job-1" } satisfies MatchJobQueueData,
      store,
      {
        complete: async () =>
          JSON.stringify({
            score: 71,
            verdict: "good-match",
            missingSkills: ["SQL"],
            explanation: "Strong product fit with a data gap.",
          }),
      },
    );

    expect(result.skipped).toBeUndefined();
    expect(result.score).toBe(71);
    expect(store.updates).toHaveLength(1);
    expect(store.updates[0]).toMatchObject({
      matchScore: 71,
      matchVerdict: "good-match",
      matchMissingSkills: ["SQL"],
      matchExplanation: "Strong product fit with a data gap.",
      matchedResumeId: "resume-1",
    });
  });

  it("does not write when AI output is malformed", async () => {
    const store = createStore();

    await expect(
      processMatchJob({ jobId: "job-1" }, store, {
        complete: async () =>
          JSON.stringify({
            score: 999,
            verdict: "good-match",
            missingSkills: [],
            explanation: "Bad score.",
          }),
      }),
    ).rejects.toThrow(/between 0 and 100/i);

    expect(store.updates).toHaveLength(0);
  });

  it("skips when no resume is available", async () => {
    const store = createStore({ resume: null });
    const result = await processMatchJob({ jobId: "job-1" }, store);
    expect(result.skipped).toBe("no-resume");
    expect(store.updates).toHaveLength(0);
  });
});
