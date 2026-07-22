import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NormalizedJob } from "@aperture/shared";
import { describe, expect, it } from "vitest";

import { parseGreenhouseContent } from "../parser-engine";
import { NormalizerEngine } from "./index";

const parserFixturePath = join(
  __dirname,
  "..",
  "parser-engine",
  "fixtures",
  "jobs-response.json",
);
const parserFixture = readFileSync(parserFixturePath, "utf-8");

const NORMALIZED_JOB_FIELDS: (keyof NormalizedJob)[] = [
  "id",
  "externalId",
  "sourcePlatform",
  "sourceUrl",
  "companyId",
  "title",
  "description",
  "location",
  "workMode",
  "country",
  "employmentType",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "visaSponsorship",
  "tags",
  "postedAt",
  "firstSeenAt",
  "lastSeenAt",
  "isActive",
];

describe("parse → normalize pipeline", () => {
  it("converts parser fixture JSON into complete NormalizedJob records", () => {
    const rawJobs = parseGreenhouseContent(parserFixture, {
      companyId: "test-company",
      sourceUrl: "https://boards.greenhouse.io/example",
    });

    const engine = new NormalizerEngine();
    const syncedAt = new Date("2026-07-08T12:00:00.000Z");
    const normalized = engine.normalizeMany(rawJobs, {
      companyId: "test-company",
      syncedAt,
    });

    expect(rawJobs).toHaveLength(2);
    expect(normalized).toHaveLength(2);

    for (const job of normalized) {
      for (const field of NORMALIZED_JOB_FIELDS) {
        expect(job).toHaveProperty(field);
      }
    }

    expect(normalized[0]).toMatchObject({
      externalId: "12345",
      title: "Software Engineer",
      location: "San Francisco, CA",
      workMode: null,
      country: "United States",
      employmentType: null,
      description: "",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      visaSponsorship: null,
      tags: [],
      isActive: true,
      companyId: "test-company",
    });
    expect(normalized[0]?.postedAt).toEqual(
      new Date("2026-06-02T08:58:57-04:00"),
    );

    expect(normalized[1]).toMatchObject({
      externalId: "67890",
      title: "Product Manager",
      location: "Remote",
      workMode: "remote",
      country: null,
      employmentType: null,
      description: "",
      isActive: true,
    });
    expect(normalized[1]?.postedAt).toEqual(
      new Date("2026-07-02T03:24:50-04:00"),
    );
  });
});
