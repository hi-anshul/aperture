import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  ParserEngine,
  ParserError,
  parseGreenhouseContent,
  parseWorkdayContent,
} from "./index";

const fixturePath = join(__dirname, "fixtures", "jobs-response.json");
const fixtureContent = readFileSync(fixturePath, "utf-8");

const workdayListFixture = JSON.stringify({
  total: 2,
  jobPostings: [
    {
      title: "Software Engineer",
      externalPath: "/job/San-Jose/Software-Engineer_R100001",
      locationsText: "San Jose, CA",
      bulletFields: ["R100001"],
    },
    {
      title: "Product Manager",
      externalPath: "/job/Remote/Product-Manager_R100002",
      locationsText: "Remote",
      bulletFields: ["R100002"],
    },
  ],
});

describe("parseGreenhouseContent", () => {
  it("converts a real API response fixture into valid RawJob[]", () => {
    const jobs = parseGreenhouseContent(fixtureContent, {
      sourceUrl: "https://boards.greenhouse.io/example",
      companyId: "company-1",
    });

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      sourcePlatform: "greenhouse",
      sourceUrl: "https://boards.greenhouse.io/example/jobs/12345",
      externalId: "12345",
      raw: expect.objectContaining({
        id: 12345,
        title: "Software Engineer",
      }),
    });
    expect(jobs[1]).toMatchObject({
      sourcePlatform: "greenhouse",
      externalId: "67890",
      sourceUrl: "https://boards.greenhouse.io/example/jobs/67890",
    });
  });

  it("accepts an empty jobs array from a valid response", () => {
    const jobs = parseGreenhouseContent(JSON.stringify({ jobs: [] }));

    expect(jobs).toEqual([]);
  });

  it("skips individual jobs missing required fields while keeping valid entries", () => {
    const jobs = parseGreenhouseContent(
      JSON.stringify({
        jobs: [
          { id: 1, absolute_url: "https://boards.greenhouse.io/example/jobs/1" },
          { title: "Missing id and url" },
          {
            id: "job-2",
            absolute_url: "https://boards.greenhouse.io/example/jobs/2",
          },
        ],
      }),
    );

    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.externalId).toBe("1");
    expect(jobs[1]?.externalId).toBe("job-2");
  });

  it("throws ParserError for invalid JSON instead of returning an empty result", () => {
    expect(() => parseGreenhouseContent("{not-json")).toThrow(ParserError);

    try {
      parseGreenhouseContent("{not-json");
    } catch (error) {
      expect(error).toBeInstanceOf(ParserError);
      const parserError = error as ParserError;
      expect(parserError.details.code).toBe("INVALID_JSON");
      expect(parserError.toSyncHistoryMessage()).toContain("INVALID_JSON");
    }
  });

  it("throws ParserError when jobs array is missing", () => {
    expect(() => parseGreenhouseContent('{"meta":"only"}')).toThrow(ParserError);

    try {
      parseGreenhouseContent('{"meta":"only"}');
    } catch (error) {
      expect(error).toBeInstanceOf(ParserError);
      expect((error as ParserError).details.code).toBe("INVALID_STRUCTURE");
    }
  });

  it("throws ParserError when every job entry is invalid", () => {
    expect(() =>
      parseGreenhouseContent(
        JSON.stringify({
          jobs: [{ title: "No id" }, { id: 99 }],
        }),
      ),
    ).toThrow(ParserError);
  });
});

describe("ParserEngine", () => {
  it("routes greenhouse platform requests to the Greenhouse parser", () => {
    const engine = new ParserEngine();
    const jobs = engine.parse({
      platform: "greenhouse",
      content: fixtureContent,
    });

    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.sourcePlatform).toBe("greenhouse");
  });

  it("routes workday platform requests to the Workday parser", () => {
    const engine = new ParserEngine();
    const jobs = engine.parse({
      platform: "workday",
      content: workdayListFixture,
      sourceUrl: "https://example.wd5.myworkdayjobs.com/careers",
    });

    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.sourcePlatform).toBe("workday");
    expect(jobs[0]?.externalId).toBe("R100001");
  });

  it("throws for unsupported platforms", () => {
    const engine = new ParserEngine();

    expect(() =>
      engine.parse({
        platform: "lever",
        content: fixtureContent,
      }),
    ).toThrow(ParserError);
  });

  it("contains no network calls — fixture string is parsed locally", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("fetch should not be called"),
    );

    parseGreenhouseContent(fixtureContent);
    parseWorkdayContent(workdayListFixture, {
      sourceUrl: "https://example.wd5.myworkdayjobs.com/careers",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("parseWorkdayContent", () => {
  it("converts a CXS list fixture into valid RawJob[]", () => {
    const jobs = parseWorkdayContent(workdayListFixture, {
      sourceUrl: "https://example.wd5.myworkdayjobs.com/careers",
    });

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      sourcePlatform: "workday",
      externalId: "R100001",
      sourceUrl:
        "https://example.wd5.myworkdayjobs.com/careers/job/San-Jose/Software-Engineer_R100001",
    });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseWorkdayContent("{not-json")).toThrow(ParserError);
  });

  it("throws when jobPostings is missing", () => {
    expect(() => parseWorkdayContent('{"total":0}')).toThrow(ParserError);
  });
});
