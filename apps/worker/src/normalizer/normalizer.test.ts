import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { RawJob } from "@aperture/shared";
import { describe, expect, it } from "vitest";

import {
  NormalizerEngine,
  normalizeAshbyJob,
  normalizeGreenhouseJob,
  normalizeLeverJob,
  normalizeWorkdayJob,
} from "./index";

const fixturePath = join(__dirname, "fixtures", "greenhouse-raw-jobs.json");
const fixtureJobs = JSON.parse(readFileSync(fixturePath, "utf-8")) as RawJob[];

const workdayFixturePath = join(__dirname, "fixtures", "workday-raw-jobs.json");
const workdayFixtureJobs = JSON.parse(
  readFileSync(workdayFixturePath, "utf-8"),
) as RawJob[];

const leverFixturePath = join(__dirname, "fixtures", "lever-raw-jobs.json");
const leverFixtureJobs = JSON.parse(
  readFileSync(leverFixturePath, "utf-8"),
) as RawJob[];

const ashbyFixturePath = join(__dirname, "fixtures", "ashby-raw-jobs.json");
const ashbyFixtureJobs = JSON.parse(
  readFileSync(ashbyFixturePath, "utf-8"),
) as RawJob[];

const syncedAt = new Date("2026-07-08T12:00:00.000Z");
const companyId = "company-1";

describe("normalizeGreenhouseJob", () => {
  it("maps a real Greenhouse RawJob fixture into a complete NormalizedJob", () => {
    const normalized = normalizeGreenhouseJob(fixtureJobs[0]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.externalId).toBe("12345");
    expect(normalized.sourcePlatform).toBe("greenhouse");
    expect(normalized.sourceUrl).toBe(
      "https://boards.greenhouse.io/example/jobs/12345",
    );
    expect(normalized.companyId).toBe(companyId);
    expect(normalized.title).toBe("Software Engineer");
    expect(normalized.description).toBe(
      "<p>Build reliable systems for our core platform.</p>",
    );
    expect(normalized.location).toBe("San Francisco, CA");
    expect(normalized.workMode).toBeNull();
    expect(normalized.country).toBe("United States");
    expect(normalized.employmentType).toBe("full-time");
    expect(normalized.salaryMin).toBe(140000);
    expect(normalized.salaryMax).toBe(180000);
    expect(normalized.salaryCurrency).toBe("USD");
    expect(normalized.visaSponsorship).toBeNull();
    expect(normalized.tags).toEqual(["Engineering", "San Francisco"]);
    expect(normalized.postedAt).toEqual(new Date("2026-06-02T08:58:57-04:00"));
    expect(normalized.firstSeenAt).toEqual(syncedAt);
    expect(normalized.lastSeenAt).toEqual(syncedAt);
    expect(normalized.isActive).toBe(true);
    expect(normalized.id).toEqual(expect.any(String));
  });

  it("derives remote work mode and contract employment type from metadata/title", () => {
    const normalized = normalizeGreenhouseJob(fixtureJobs[1]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.location).toBe("Paris, France");
    expect(normalized.workMode).toBe("remote");
    expect(normalized.country).toBe("France");
    expect(normalized.employmentType).toBe("contract");
    expect(normalized.description).toBe("");
    expect(normalized.salaryMin).toBeNull();
    expect(normalized.salaryMax).toBeNull();
    expect(normalized.salaryCurrency).toBeNull();
    expect(normalized.tags).toEqual(["Product"]);
  });

  it("handles missing optional fields gracefully without throwing", () => {
    expect(() =>
      normalizeGreenhouseJob(fixtureJobs[2]!, {
        companyId,
        syncedAt,
      }),
    ).not.toThrow();

    const normalized = normalizeGreenhouseJob(fixtureJobs[2]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.title).toBe("Untitled");
    expect(normalized.description).toBe("");
    expect(normalized.location).toBeNull();
    expect(normalized.workMode).toBeNull();
    expect(normalized.country).toBeNull();
    expect(normalized.employmentType).toBeNull();
    expect(normalized.salaryMin).toBeNull();
    expect(normalized.salaryMax).toBeNull();
    expect(normalized.salaryCurrency).toBeNull();
    expect(normalized.visaSponsorship).toBeNull();
    expect(normalized.tags).toEqual([]);
    expect(normalized.postedAt).toBeNull();
  });

  it("preserves an existing job id and firstSeenAt when provided", () => {
    const firstSeenAt = new Date("2026-06-01T00:00:00.000Z");
    const normalized = normalizeGreenhouseJob(fixtureJobs[0]!, {
      companyId,
      jobId: "existing-job-id",
      firstSeenAt,
      syncedAt,
      isActive: false,
    });

    expect(normalized.id).toBe("existing-job-id");
    expect(normalized.firstSeenAt).toEqual(firstSeenAt);
    expect(normalized.lastSeenAt).toEqual(syncedAt);
    expect(normalized.isActive).toBe(false);
  });
});

describe("NormalizerEngine", () => {
  it("routes greenhouse RawJob entries through the Greenhouse normalizer", () => {
    const engine = new NormalizerEngine();
    const normalized = engine.normalizeMany(fixtureJobs.slice(0, 2), {
      companyId,
      syncedAt,
    });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.sourcePlatform).toBe("greenhouse");
    expect(normalized[1]?.workMode).toBe("remote");
  });

  it("routes workday RawJob entries through the Workday normalizer", () => {
    const engine = new NormalizerEngine();
    const normalized = engine.normalizeMany(workdayFixtureJobs.slice(0, 2), {
      companyId,
      syncedAt,
    });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.sourcePlatform).toBe("workday");
    expect(normalized[0]?.title).toBe("Software Engineer");
    expect(normalized[1]?.workMode).toBe("remote");
    expect(normalized[1]?.employmentType).toBe("part-time");
  });

  it("routes lever RawJob entries through the Lever normalizer", () => {
    const engine = new NormalizerEngine();
    const normalized = engine.normalizeMany(leverFixtureJobs.slice(0, 2), {
      companyId,
      syncedAt,
    });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.sourcePlatform).toBe("lever");
    expect(normalized[0]?.title).toBe("Software Engineer");
    expect(normalized[0]?.workMode).toBe("hybrid");
    expect(normalized[1]?.workMode).toBe("remote");
    expect(normalized[1]?.employmentType).toBe("contract");
  });

  it("routes ashby RawJob entries through the Ashby normalizer", () => {
    const engine = new NormalizerEngine();
    const normalized = engine.normalizeMany(ashbyFixtureJobs.slice(0, 2), {
      companyId,
      syncedAt,
    });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.sourcePlatform).toBe("ashby");
    expect(normalized[0]?.title).toBe("Software Engineer");
    expect(normalized[0]?.workMode).toBe("hybrid");
    expect(normalized[1]?.workMode).toBe("remote");
    expect(normalized[1]?.employmentType).toBe("contract");
  });

  it("routes static-html and react-rendered RawJob entries through the HTML normalizer", () => {
    const engine = new NormalizerEngine();
    const jobs = [
      {
        sourcePlatform: "static-html" as const,
        sourceUrl: "https://careers.example.com/careers/swe",
        externalId: "/careers/swe",
        raw: {
          title: "Software Engineer",
          location: "Remote",
          description: "Full-time role with visa sponsorship",
        },
      },
      {
        sourcePlatform: "react-rendered" as const,
        sourceUrl: "https://jobs.example.com/careers/pm",
        externalId: "/careers/pm",
        raw: {
          title: "Product Manager",
          location: "Hybrid - NYC",
          description: null,
        },
      },
    ];

    const normalized = engine.normalizeMany(jobs, { companyId, syncedAt });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.sourcePlatform).toBe("static-html");
    expect(normalized[0]?.workMode).toBe("remote");
    expect(normalized[0]?.employmentType).toBe("full-time");
    expect(normalized[0]?.visaSponsorship).toBe(true);
    expect(normalized[1]?.sourcePlatform).toBe("react-rendered");
    expect(normalized[1]?.workMode).toBe("hybrid");
  });

  it("throws for unsupported platforms", () => {
    const engine = new NormalizerEngine();

    expect(() =>
      engine.normalize(
        {
          sourcePlatform: "smartrecruiters",
          sourceUrl: "https://jobs.smartrecruiters.com/example/abc",
          externalId: "abc",
          raw: {},
        },
        { companyId, syncedAt },
      ),
    ).toThrow('No normalizer registered for platform "smartrecruiters"');
  });
});

describe("normalizeWorkdayJob", () => {
  it("maps a Workday RawJob fixture into a NormalizedJob", () => {
    const normalized = normalizeWorkdayJob(workdayFixtureJobs[0]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.externalId).toBe("R100001");
    expect(normalized.sourcePlatform).toBe("workday");
    expect(normalized.title).toBe("Software Engineer");
    expect(normalized.description).toBe(
      "<p>Build reliable systems for our core platform.</p>",
    );
    expect(normalized.location).toBe("San Jose");
    expect(normalized.country).toBe("United States of America");
    expect(normalized.employmentType).toBe("full-time");
    expect(normalized.postedAt).toEqual(new Date("2026-07-10"));
  });

  it("handles missing optional Workday fields gracefully", () => {
    const normalized = normalizeWorkdayJob(workdayFixtureJobs[2]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.title).toBe("Untitled role");
    expect(normalized.description).toBe("");
    expect(normalized.location).toBeNull();
    expect(normalized.employmentType).toBeNull();
  });

  it("derives country from Workday location prefixes when detail country is missing", () => {
    const normalized = normalizeWorkdayJob(
      {
        sourcePlatform: "workday",
        sourceUrl:
          "https://corporate.visa.com/en/jobs/job/US/Austin/Role_R1",
        externalId: "R1",
        raw: {
          title: "Software Engineer",
          locationsText: "US - Austin, TX",
          externalPath: "/job/US/Austin/Role_R1",
        },
      },
      { companyId, syncedAt },
    );

    expect(normalized.location).toBe("US - Austin, TX");
    expect(normalized.country).toBe("United States");
  });
});

describe("normalizeLeverJob", () => {
  it("maps a Lever RawJob fixture into a NormalizedJob", () => {
    const normalized = normalizeLeverJob(leverFixtureJobs[0]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.externalId).toBe("posting-1001");
    expect(normalized.sourcePlatform).toBe("lever");
    expect(normalized.title).toBe("Software Engineer");
    expect(normalized.description).toContain(
      "Build reliable systems for our core platform.",
    );
    expect(normalized.description).toContain("Requirements");
    expect(normalized.location).toBe("San Francisco, CA");
    expect(normalized.country).toBe("US");
    expect(normalized.workMode).toBe("hybrid");
    expect(normalized.employmentType).toBe("full-time");
    expect(normalized.salaryMin).toBe(140000);
    expect(normalized.salaryMax).toBe(180000);
    expect(normalized.salaryCurrency).toBe("USD");
    expect(normalized.postedAt).toEqual(new Date(1717313937000));
    expect(normalized.tags).toEqual([
      "Engineering",
      "Product",
      "San Francisco, CA",
      "full-time",
      "hybrid",
    ]);
  });

  it("handles missing optional Lever fields gracefully", () => {
    const normalized = normalizeLeverJob(leverFixtureJobs[2]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.title).toBe("Untitled role");
    expect(normalized.description).toBe("");
    expect(normalized.location).toBeNull();
    expect(normalized.employmentType).toBeNull();
    expect(normalized.workMode).toBeNull();
  });
});

describe("normalizeAshbyJob", () => {
  it("maps an Ashby RawJob fixture into a NormalizedJob", () => {
    const normalized = normalizeAshbyJob(ashbyFixtureJobs[0]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.externalId).toBe("job-1001");
    expect(normalized.sourcePlatform).toBe("ashby");
    expect(normalized.title).toBe("Software Engineer");
    expect(normalized.description).toBe(
      "Build reliable systems for our core platform.",
    );
    expect(normalized.location).toBe("San Francisco, CA");
    expect(normalized.country).toBe("United States");
    expect(normalized.workMode).toBe("hybrid");
    expect(normalized.employmentType).toBe("full-time");
    expect(normalized.salaryMin).toBe(140000);
    expect(normalized.salaryMax).toBe(180000);
    expect(normalized.salaryCurrency).toBe("USD");
    expect(normalized.postedAt).toEqual(
      new Date("2026-06-02T08:58:57.000+00:00"),
    );
    expect(normalized.tags).toEqual([
      "Engineering",
      "Platform",
      "San Francisco, CA",
      "full-time",
      "hybrid",
    ]);
  });

  it("handles missing optional Ashby fields gracefully", () => {
    const normalized = normalizeAshbyJob(ashbyFixtureJobs[2]!, {
      companyId,
      syncedAt,
    });

    expect(normalized.title).toBe("Untitled role");
    expect(normalized.description).toBe("");
    expect(normalized.location).toBeNull();
    expect(normalized.employmentType).toBeNull();
    expect(normalized.workMode).toBeNull();
  });
});
