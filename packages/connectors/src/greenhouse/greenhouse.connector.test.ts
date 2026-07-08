import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Company } from "@aperture/shared";
import { describe, expect, it } from "vitest";

import { ConnectorRegistry } from "../connector";
import { createDefaultRegistry } from "../registry";
import {
  GreenhouseConnector,
  extractBoardToken,
  isGreenhouseCareersUrl,
  parseGreenhouseJobs,
} from "./index";
import type { GreenhouseJobsResponse } from "./types";

const fixturePath = join(__dirname, "fixtures", "jobs-response.json");
const fixture = JSON.parse(
  readFileSync(fixturePath, "utf-8"),
) as GreenhouseJobsResponse;

const exampleCompany: Company = {
  id: "company-1",
  name: "Example Co",
  careersUrl: "https://boards.greenhouse.io/example",
  platform: "greenhouse",
  logoUrl: null,
};

describe("isGreenhouseCareersUrl", () => {
  it("matches boards.greenhouse.io URLs", () => {
    expect(isGreenhouseCareersUrl("https://boards.greenhouse.io/example")).toBe(
      true,
    );
  });

  it("matches job-boards.greenhouse.io URLs", () => {
    expect(
      isGreenhouseCareersUrl("https://job-boards.greenhouse.io/example"),
    ).toBe(true);
  });

  it("rejects non-Greenhouse URLs", () => {
    expect(isGreenhouseCareersUrl("https://jobs.lever.co/example")).toBe(false);
    expect(isGreenhouseCareersUrl("not-a-url")).toBe(false);
  });
});

describe("extractBoardToken", () => {
  it("extracts token from board path", () => {
    expect(extractBoardToken("https://boards.greenhouse.io/airbnb")).toBe(
      "airbnb",
    );
    expect(
      extractBoardToken("https://boards.greenhouse.io/airbnb/jobs/123"),
    ).toBe("airbnb");
  });

  it("extracts token from embed query param", () => {
    expect(
      extractBoardToken(
        "https://boards.greenhouse.io/embed/job_board?for=airbnb",
      ),
    ).toBe("airbnb");
  });

  it("returns null for non-Greenhouse URLs", () => {
    expect(extractBoardToken("https://jobs.lever.co/example")).toBeNull();
  });
});

describe("parseGreenhouseJobs", () => {
  it("maps fixture jobs to valid RawJob objects", () => {
    const jobs = parseGreenhouseJobs(fixture);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      sourcePlatform: "greenhouse",
      sourceUrl: "https://boards.greenhouse.io/example/jobs/12345",
      externalId: "12345",
      raw: fixture.jobs[0],
    });
    expect(jobs[1]?.externalId).toBe("67890");
    expect(jobs[1]?.sourceUrl).toBe(
      "https://boards.greenhouse.io/example/jobs/67890",
    );
  });
});

describe("GreenhouseConnector", () => {
  it("canHandle returns true for Greenhouse careers URLs", () => {
    const connector = new GreenhouseConnector();
    expect(connector.canHandle("https://boards.greenhouse.io/stripe")).toBe(
      true,
    );
    expect(connector.canHandle("https://jobs.lever.co/stripe")).toBe(false);
  });

  it("fetch returns RawJob[] from mocked API response", async () => {
    let requestedUrl = "";
    const mockFetch = async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => fixture,
      } as Response;
    };

    const connector = new GreenhouseConnector(mockFetch);
    const jobs = await connector.fetch(exampleCompany);

    expect(requestedUrl).toBe(
      "https://boards-api.greenhouse.io/v1/boards/example/jobs?content=true",
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.sourcePlatform).toBe("greenhouse");
    expect(jobs[0]?.externalId).toBe("12345");
  });

  it("fetch throws when board token cannot be extracted", async () => {
    const connector = new GreenhouseConnector();

    await expect(
      connector.fetch({
        ...exampleCompany,
        careersUrl: "https://boards.greenhouse.io/embed/job_board",
      }),
    ).rejects.toThrow(/Could not extract Greenhouse board token/);
  });

  it("fetch throws on non-OK API response", async () => {
    const mockFetch = async () =>
      ({
        ok: false,
        status: 404,
      }) as Response;

    const connector = new GreenhouseConnector(mockFetch);

    await expect(connector.fetch(exampleCompany)).rejects.toThrow(
      /Greenhouse API request failed \(404\)/,
    );
  });
});

describe("ConnectorRegistry", () => {
  it("resolve picks Greenhouse connector for Greenhouse careers URL", async () => {
    const registry = createDefaultRegistry();
    const connector = await registry.resolve(
      "https://boards.greenhouse.io/stripe",
    );

    expect(connector).toBeDefined();
    expect(connector?.platform).toBe("greenhouse");
  });

  it("resolve returns undefined for unsupported URLs", async () => {
    const registry = createDefaultRegistry();
    const connector = await registry.resolve("https://jobs.lever.co/stripe");

    expect(connector).toBeUndefined();
  });

  it("manual registry registration works", async () => {
    const registry = new ConnectorRegistry();
    registry.register(new GreenhouseConnector());

    const connector = await registry.resolve(
      "https://job-boards.greenhouse.io/example",
    );
    expect(connector?.platform).toBe("greenhouse");
  });
});
