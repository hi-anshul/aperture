import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DedupeEngine } from "./index";
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

describe("normalize → dedupe pipeline", () => {
  it("dedupes normalized jobs against existing DB snapshots without creating duplicates", () => {
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

    expect(firstRun.jobs).toHaveLength(2);
    expect(firstRun.jobs.every((entry) => entry.action === "insert")).toBe(true);

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

    expect(secondRun.jobs).toHaveLength(2);
    expect(secondRun.jobs.every((entry) => entry.action === "update")).toBe(true);
    expect(secondRun.jobs.every((entry) => entry.job.lastSeenAt === resyncAt)).toBe(
      true,
    );
    expect(
      secondRun.jobs.every((entry) => entry.job.firstSeenAt === firstSeenAt),
    ).toBe(true);
  });
});
