import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { computeJobDiff, isEmptyDiff } from "../change-detection";
import { DedupeEngine } from "../dedupe-engine";
import { parseGreenhouseContent } from "../parser-engine";
import { NormalizerEngine } from "../normalizer";

const parserFixturePath = join(
  __dirname,
  "..",
  "parser-engine",
  "fixtures",
  "jobs-response.json",
);
const parserFixture = readFileSync(parserFixturePath, "utf-8");

describe("dedupe → change detection pipeline", () => {
  it("produces an empty diff when re-syncing unchanged fixture jobs", () => {
    const rawJobs = parseGreenhouseContent(parserFixture, {
      companyId: "test-company",
      sourceUrl: "https://boards.greenhouse.io/example",
    });

    const syncedAt = new Date("2026-07-08T12:00:00.000Z");
    const firstSeenAt = new Date("2026-07-01T12:00:00.000Z");

    const normalizer = new NormalizerEngine();
    const normalized = normalizer.normalizeMany(rawJobs, {
      companyId: "test-company",
      syncedAt,
    });

    const dedupeEngine = new DedupeEngine();
    const firstRun = dedupeEngine.dedupe(normalized, {
      companyId: "test-company",
      companyName: "Example",
      syncedAt,
      existingJobs: [],
    });

    const existingForDiff = firstRun.jobs
      .filter((entry) => entry.action !== "deactivate")
      .map((entry) => ({
        id: entry.job.id,
        companyId: entry.job.companyId,
        externalId: entry.job.externalId,
        title: entry.job.title,
        location: entry.job.location,
        salaryMin: entry.job.salaryMin,
        salaryMax: entry.job.salaryMax,
        salaryCurrency: entry.job.salaryCurrency,
        isActive: true,
      }));

    const existingSnapshots = firstRun.jobs.map((entry) => ({
      id: entry.job.id,
      companyId: entry.job.companyId,
      externalId: entry.job.externalId,
      title: entry.job.title,
      location: entry.job.location,
      firstSeenAt,
      isActive: true,
    }));

    const resyncAt = new Date("2026-07-09T12:00:00.000Z");
    const resynced = normalizer.normalizeMany(rawJobs, {
      companyId: "test-company",
      syncedAt: resyncAt,
    });

    const secondRun = dedupeEngine.dedupe(resynced, {
      companyId: "test-company",
      companyName: "Example",
      syncedAt: resyncAt,
      existingJobs: existingSnapshots,
    });

    const diff = computeJobDiff(
      "test-company",
      secondRun.jobs,
      existingForDiff,
    );

    expect(isEmptyDiff(diff)).toBe(true);
  });
});
