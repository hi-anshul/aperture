import type { NormalizedJob } from "@aperture/shared";
import { describe, expect, it } from "vitest";

import type { DedupedJob, DedupeMatchType } from "../dedupe-engine";
import {
  computeJobDiff,
  hasMeaningfulChange,
  isEmptyDiff,
} from "./change-detection";
import type { ExistingJobForDiff } from "./types";

const companyId = "company-1";
const syncedAt = new Date("2026-07-08T12:00:00.000Z");
const firstSeenAt = new Date("2026-07-01T12:00:00.000Z");

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    id: "job-1",
    externalId: "ext-1",
    sourcePlatform: "greenhouse",
    sourceUrl: "https://boards.greenhouse.io/example/jobs/1",
    companyId,
    title: "Software Engineer",
    description: "Build reliable systems.",
    location: "San Francisco, CA",
    workMode: null,
    country: "United States",
    employmentType: "full-time",
    salaryMin: 140000,
    salaryMax: 180000,
    salaryCurrency: "USD",
    visaSponsorship: null,
    tags: ["Engineering"],
    postedAt: null,
    firstSeenAt,
    lastSeenAt: syncedAt,
    isActive: true,
    ...overrides,
  };
}

function makeExisting(
  overrides: Partial<ExistingJobForDiff> = {},
): ExistingJobForDiff {
  return {
    id: "job-1",
    companyId,
    externalId: "ext-1",
    title: "Software Engineer",
    location: "San Francisco, CA",
    salaryMin: 140000,
    salaryMax: 180000,
    salaryCurrency: "USD",
    isActive: true,
    ...overrides,
  };
}

function makeDeduped(
  job: NormalizedJob,
  action: "insert" | "update",
  matchType?: DedupeMatchType,
): DedupedJob {
  return { job, action, matchType };
}

describe("hasMeaningfulChange", () => {
  it("detects title, location, and salary changes", () => {
    const existing = makeExisting();

    expect(hasMeaningfulChange(existing, makeJob({ title: "Staff Engineer" }))).toBe(
      true,
    );
    expect(
      hasMeaningfulChange(existing, makeJob({ location: "Remote" })),
    ).toBe(true);
    expect(
      hasMeaningfulChange(existing, makeJob({ salaryMin: 150000 })),
    ).toBe(true);
    expect(
      hasMeaningfulChange(existing, makeJob({ salaryMax: 190000 })),
    ).toBe(true);
    expect(
      hasMeaningfulChange(existing, makeJob({ salaryCurrency: "EUR" })),
    ).toBe(true);
  });

  it("ignores last_seen_at-only changes", () => {
    const existing = makeExisting();
    const resynced = makeJob({
      lastSeenAt: new Date("2026-07-09T12:00:00.000Z"),
      description: "Updated description only",
    });

    expect(hasMeaningfulChange(existing, resynced)).toBe(false);
  });
});

describe("computeJobDiff", () => {
  it("produces an empty diff when the source page has no real changes", () => {
    const existing = makeExisting();
    const deduped = [makeDeduped(makeJob(), "update")];

    const diff = computeJobDiff(companyId, deduped, [existing]);

    expect(isEmptyDiff(diff)).toBe(true);
    expect(diff.newJobs).toEqual([]);
    expect(diff.removedJobIds).toEqual([]);
    expect(diff.updatedJobs).toEqual([]);
  });

  it("detects new jobs", () => {
    const deduped = [makeDeduped(makeJob({ id: "job-new", externalId: "ext-new" }), "insert")];

    const diff = computeJobDiff(companyId, deduped, []);

    expect(diff.newJobs).toHaveLength(1);
    expect(diff.newJobs[0]?.externalId).toBe("ext-new");
    expect(diff.removedJobIds).toEqual([]);
    expect(diff.updatedJobs).toEqual([]);
  });

  it("detects removed jobs by external id", () => {
    const existing = [
      makeExisting(),
      makeExisting({
        id: "job-2",
        externalId: "ext-2",
        title: "Product Manager",
      }),
    ];

    const diff = computeJobDiff(
      companyId,
      [
        makeDeduped(makeJob(), "update"),
        {
          action: "deactivate",
          job: {
            id: "job-2",
            externalId: "ext-2",
            companyId,
            title: "Product Manager",
            location: "San Francisco, CA",
            firstSeenAt: new Date("2026-07-01T12:00:00.000Z"),
            lastSeenAt: new Date("2026-07-08T12:00:00.000Z"),
            isActive: false,
          },
        },
      ],
      existing,
    );

    expect(diff.removedJobIds).toEqual(["job-2"]);
    expect(diff.newJobs).toEqual([]);
  });

  it("does not mark already-inactive jobs as removed", () => {
    const existing = [
      makeExisting(),
      makeExisting({
        id: "job-2",
        externalId: "ext-2",
        isActive: false,
      }),
    ];

    const diff = computeJobDiff(companyId, [makeDeduped(makeJob(), "update")], existing);

    expect(diff.removedJobIds).toEqual([]);
  });

  it("detects meaningful updates to title, salary, and location", () => {
    const existing = makeExisting();
    const deduped = [
      makeDeduped(makeJob({ title: "Senior Software Engineer" }), "update"),
    ];

    const diff = computeJobDiff(companyId, deduped, [existing]);

    expect(diff.updatedJobs).toHaveLength(1);
    expect(diff.updatedJobs[0]?.title).toBe("Senior Software Engineer");
    expect(diff.newJobs).toEqual([]);
    expect(diff.removedJobIds).toEqual([]);
  });

  it("treats reappearing inactive jobs as updated", () => {
    const existing = makeExisting({ isActive: false });
    const deduped = [makeDeduped(makeJob(), "update")];

    const diff = computeJobDiff(companyId, deduped, [existing]);

    expect(diff.updatedJobs).toHaveLength(1);
    expect(diff.newJobs).toEqual([]);
  });
});
