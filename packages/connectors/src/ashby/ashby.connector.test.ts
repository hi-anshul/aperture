import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Company } from "@aperture/shared";
import { describe, expect, it } from "vitest";

import { createDefaultRegistry } from "../registry";
import {
  AshbyConnector,
  buildAshbyJobBoardApiUrl,
  extractAshbyBoard,
  extractAshbyBoardFromHtml,
  isAshbyCareersUrl,
  parseAshbyJobs,
} from "./index";
import type { AshbyJobsResponse } from "./types";

const fixturePath = join(__dirname, "fixtures", "jobs-response.json");
const fixture = JSON.parse(
  readFileSync(fixturePath, "utf-8"),
) as AshbyJobsResponse;

const exampleCompany: Company = {
  id: "company-1",
  name: "Example Co",
  careersUrl: "https://jobs.ashbyhq.com/example",
  platform: "ashby",
  logoUrl: null,
};

describe("isAshbyCareersUrl", () => {
  it("matches jobs.ashbyhq.com URLs", () => {
    expect(isAshbyCareersUrl("https://jobs.ashbyhq.com/example")).toBe(true);
    expect(
      isAshbyCareersUrl("https://jobs.ashbyhq.com/example/job-1001"),
    ).toBe(true);
  });

  it("matches Ashby API hosts", () => {
    expect(
      isAshbyCareersUrl(
        "https://api.ashbyhq.com/posting-api/job-board/example?includeCompensation=true",
      ),
    ).toBe(true);
  });

  it("rejects non-Ashby URLs", () => {
    expect(isAshbyCareersUrl("https://jobs.lever.co/example")).toBe(false);
    expect(isAshbyCareersUrl("not-a-url")).toBe(false);
  });
});

describe("extractAshbyBoard", () => {
  it("extracts board from jobs.ashbyhq.com paths", () => {
    expect(extractAshbyBoard("https://jobs.ashbyhq.com/Ashby")).toEqual({
      boardName: "Ashby",
    });
    expect(
      extractAshbyBoard("https://jobs.ashbyhq.com/Ashby/abc-123"),
    ).toEqual({
      boardName: "Ashby",
    });
    expect(
      extractAshbyBoard("https://jobs.ashbyhq.com/example/embed.js"),
    ).toEqual({
      boardName: "example",
    });
  });

  it("extracts board from API job-board paths", () => {
    expect(
      extractAshbyBoard(
        "https://api.ashbyhq.com/posting-api/job-board/ramp?includeCompensation=true",
      ),
    ).toEqual({ boardName: "ramp" });
  });

  it("returns null for non-Ashby URLs", () => {
    expect(extractAshbyBoard("https://jobs.lever.co/example")).toBeNull();
  });
});

describe("extractAshbyBoardFromHtml", () => {
  it("recovers board from embedded Ashby jobs / API links", () => {
    expect(
      extractAshbyBoardFromHtml(
        `<script src="https://jobs.ashbyhq.com/acme/embed.js"></script>`,
      ),
    ).toEqual({ boardName: "acme" });

    expect(
      extractAshbyBoardFromHtml(
        `<a href="https://api.ashbyhq.com/posting-api/job-board/acme">API</a>`,
      ),
    ).toEqual({ boardName: "acme" });
  });
});

describe("buildAshbyJobBoardApiUrl", () => {
  it("builds includeCompensation API URL", () => {
    expect(buildAshbyJobBoardApiUrl({ boardName: "Ashby" })).toBe(
      "https://api.ashbyhq.com/posting-api/job-board/Ashby?includeCompensation=true",
    );
  });
});

describe("parseAshbyJobs", () => {
  it("maps fixture jobs to valid RawJob objects", () => {
    const jobs = parseAshbyJobs(fixture);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      sourcePlatform: "ashby",
      sourceUrl: "https://jobs.ashbyhq.com/example/job-1001",
      externalId: "job-1001",
      raw: fixture.jobs?.[0],
    });
    expect(jobs[1]?.externalId).toBe("job-1002");
    expect(jobs[1]?.sourceUrl).toBe(
      "https://jobs.ashbyhq.com/example/job-1002",
    );
  });

  it("skips jobs missing id or jobUrl", () => {
    const jobs = parseAshbyJobs({
      jobs: [
        { title: "No id", jobUrl: "https://jobs.ashbyhq.com/example/x" },
        { id: "only-id", title: "No url" },
        fixture.jobs?.[0]!,
      ],
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.externalId).toBe("job-1001");
  });
});

describe("AshbyConnector", () => {
  it("canHandle returns true for Ashby careers URLs", () => {
    const connector = new AshbyConnector();
    expect(connector.canHandle("https://jobs.ashbyhq.com/Ashby")).toBe(true);
    expect(connector.canHandle("https://jobs.lever.co/example")).toBe(false);
  });

  it("fetch returns RawJob[] from mocked API response", async () => {
    let requestedUrl = "";
    const mockFetch: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const connector = new AshbyConnector(mockFetch);
    const jobs = await connector.fetch(exampleCompany);

    expect(requestedUrl).toBe(
      "https://api.ashbyhq.com/posting-api/job-board/example?includeCompensation=true",
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.sourcePlatform).toBe("ashby");
    expect(jobs[0]?.externalId).toBe("job-1001");
  });

  it("recovers board from custom careers HTML when URL is not Ashby", async () => {
    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url === "https://careers.example.com/jobs") {
        return new Response(
          `<script src="https://jobs.ashbyhq.com/acme/embed.js"></script>`,
          { status: 200 },
        );
      }
      if (url.startsWith("https://api.ashbyhq.com/posting-api/job-board/acme")) {
        return new Response(JSON.stringify(fixture), { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const connector = new AshbyConnector(mockFetch);
    const jobs = await connector.fetch({
      ...exampleCompany,
      careersUrl: "https://careers.example.com/jobs",
    });

    expect(jobs).toHaveLength(2);
  });

  it("throws when board cannot be resolved", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("<html><body>No ashby links</body></html>", { status: 200 });

    const connector = new AshbyConnector(mockFetch);
    await expect(
      connector.fetch({
        ...exampleCompany,
        careersUrl: "https://careers.example.com/jobs",
      }),
    ).rejects.toThrow(/Could not extract Ashby board/);
  });

  it("throws on non-OK API responses", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("forbidden", { status: 403 });

    const connector = new AshbyConnector(mockFetch);
    await expect(connector.fetch(exampleCompany)).rejects.toThrow(
      /Ashby job board API request failed \(403\)/,
    );
  });
});

describe("ConnectorRegistry with Ashby", () => {
  it("resolve picks Ashby connector for jobs.ashbyhq.com URLs", async () => {
    const registry = createDefaultRegistry();
    const connector = await registry.resolve("https://jobs.ashbyhq.com/example");
    expect(connector?.platform).toBe("ashby");
  });
});
