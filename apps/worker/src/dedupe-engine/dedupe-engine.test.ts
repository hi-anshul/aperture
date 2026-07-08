import type { NormalizedJob } from "@aperture/shared";
import { describe, expect, it } from "vitest";

import {
  DedupeEngine,
  buildFuzzyKey,
  isFuzzyMatch,
  normalizeMatchText,
} from "./index";

const companyId = "company-1";
const companyName = "Example Corp";
const syncedAt = new Date("2026-07-08T12:00:00.000Z");
const previousSyncAt = new Date("2026-07-01T12:00:00.000Z");

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    id: "new-job-id",
    externalId: "12345",
    sourcePlatform: "greenhouse",
    sourceUrl: "https://boards.greenhouse.io/example/jobs/12345",
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
    postedAt: new Date("2026-06-02T08:58:57.000Z"),
    firstSeenAt: syncedAt,
    lastSeenAt: syncedAt,
    isActive: true,
    ...overrides,
  };
}

describe("match-keys", () => {
  it("normalizes whitespace and case for fuzzy matching", () => {
    expect(normalizeMatchText("  Software   Engineer  ")).toBe(
      "software engineer",
    );
    expect(normalizeMatchText(null)).toBe("");
  });

  it("matches jobs with equivalent title and location text", () => {
    expect(
      isFuzzyMatch(
        companyId,
        companyName,
        { title: "Software Engineer", location: "San Francisco, CA" },
        { title: "  software   engineer ", location: "san francisco, ca" },
      ),
    ).toBe(true);
  });

  it("does not match jobs with different titles or locations", () => {
    expect(
      isFuzzyMatch(
        companyId,
        companyName,
        { title: "Software Engineer", location: "San Francisco, CA" },
        { title: "Product Manager", location: "San Francisco, CA" },
      ),
    ).toBe(false);
  });
});

describe("DedupeEngine", () => {
  it("re-running a sync with no actual changes does not create duplicate rows", () => {
    const existing = {
      id: "existing-job-1",
      companyId,
      externalId: "12345",
      title: "Software Engineer",
      location: "San Francisco, CA",
      firstSeenAt: previousSyncAt,
      isActive: true,
    };

    const engine = new DedupeEngine();
    const result = engine.dedupe([makeJob()], {
      companyId,
      companyName,
      syncedAt,
      existingJobs: [existing],
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.action).toBe("update");
    if (result.jobs[0]?.action === "update") {
      expect(result.jobs[0].matchType).toBe("externalId");
      expect(result.jobs[0].job.id).toBe("existing-job-1");
    }
  });

  it("writes a posting seen twice in the same sync only once", () => {
    const engine = new DedupeEngine();
    const duplicate = makeJob();
    const result = engine.dedupe([duplicate, { ...duplicate }], {
      companyId,
      companyName,
      syncedAt,
      existingJobs: [],
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.action).toBe("insert");
  });

  it("updates lastSeenAt on every sync that still finds an existing posting", () => {
    const existing = {
      id: "existing-job-1",
      companyId,
      externalId: "12345",
      title: "Software Engineer",
      location: "San Francisco, CA",
      firstSeenAt: previousSyncAt,
      isActive: true,
    };

    const engine = new DedupeEngine();
    const result = engine.dedupe([makeJob()], {
      companyId,
      companyName,
      syncedAt,
      existingJobs: [existing],
    });

    expect(result.jobs[0]?.job.lastSeenAt).toEqual(syncedAt);
    expect(result.jobs[0]?.job.firstSeenAt).toEqual(previousSyncAt);
  });

  it("falls back to fuzzy title+company+location matching when external IDs differ", () => {
    const existing = {
      id: "existing-linkedin-job",
      companyId,
      externalId: "linkedin-999",
      title: "Software Engineer",
      location: "San Francisco, CA",
      firstSeenAt: previousSyncAt,
      isActive: true,
    };

    const engine = new DedupeEngine();
    const result = engine.dedupe(
      [
        makeJob({
          externalId: "greenhouse-12345",
          sourcePlatform: "greenhouse",
        }),
      ],
      {
        companyId,
        companyName,
        syncedAt,
        existingJobs: [existing],
      },
    );

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.action).toBe("update");
    if (result.jobs[0]?.action === "update") {
      expect(result.jobs[0].matchType).toBe("fuzzy");
      expect(result.jobs[0].job.id).toBe("existing-linkedin-job");
      expect(result.jobs[0].job.externalId).toBe("linkedin-999");
    }
  });

  it("does not dedupe across different companies", () => {
    const existing = {
      id: "other-company-job",
      companyId: "company-2",
      externalId: "12345",
      title: "Software Engineer",
      location: "San Francisco, CA",
      firstSeenAt: previousSyncAt,
      isActive: true,
    };

    const engine = new DedupeEngine();
    const result = engine.dedupe([makeJob()], {
      companyId,
      companyName,
      syncedAt,
      existingJobs: [existing],
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.action).toBe("insert");
  });

  it("dedupes fuzzy duplicates within the same sync batch", () => {
    const engine = new DedupeEngine();
    const result = engine.dedupe(
      [
        makeJob({ externalId: "source-a", id: "job-a" }),
        makeJob({ externalId: "source-b", id: "job-b" }),
      ],
      {
        companyId,
        companyName,
        syncedAt,
        existingJobs: [],
      },
    );

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.action).toBe("insert");
    expect(result.jobs[0]?.job.externalId).toBe("source-a");
  });

  it("includes company name in the fuzzy match key", () => {
    const keyA = buildFuzzyKey(
      companyId,
      "Example Corp",
      "Software Engineer",
      "San Francisco, CA",
    );
    const keyB = buildFuzzyKey(
      companyId,
      "Other Corp",
      "Software Engineer",
      "San Francisco, CA",
    );

    expect(keyA).not.toBe(keyB);
  });

  it("emits deactivate actions for active existing jobs missing from the sync", () => {
    const existing = {
      id: "existing-job-1",
      companyId,
      externalId: "12345",
      title: "Software Engineer",
      location: "San Francisco, CA",
      firstSeenAt: previousSyncAt,
      isActive: true,
    };
    const removed = {
      id: "removed-job",
      companyId,
      externalId: "99999",
      title: "Product Manager",
      location: "Remote",
      firstSeenAt: previousSyncAt,
      isActive: true,
    };

    const engine = new DedupeEngine();
    const result = engine.dedupe([makeJob()], {
      companyId,
      companyName,
      syncedAt,
      existingJobs: [existing, removed],
    });

    const deactivate = result.jobs.filter((entry) => entry.action === "deactivate");
    expect(deactivate).toHaveLength(1);
    expect(deactivate[0]?.job.id).toBe("removed-job");
    expect(deactivate[0]?.job.isActive).toBe(false);
  });

  it("uses incoming isActive when updating matched jobs", () => {
    const existing = {
      id: "existing-job-1",
      companyId,
      externalId: "12345",
      title: "Software Engineer",
      location: "San Francisco, CA",
      firstSeenAt: previousSyncAt,
      isActive: false,
    };

    const engine = new DedupeEngine();
    const result = engine.dedupe([makeJob({ isActive: true })], {
      companyId,
      companyName,
      syncedAt,
      existingJobs: [existing],
    });

    expect(result.jobs[0]?.action).toBe("update");
    expect(result.jobs[0]?.job.isActive).toBe(true);
  });
});
