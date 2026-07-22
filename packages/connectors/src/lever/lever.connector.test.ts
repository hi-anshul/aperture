import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Company } from "@aperture/shared";
import { describe, expect, it } from "vitest";

import { createDefaultRegistry } from "../registry";
import {
  LeverConnector,
  buildLeverPostingsApiUrl,
  extractLeverSite,
  extractLeverSiteFromHtml,
  isLeverCareersUrl,
  parseLeverPostings,
} from "./index";
import type { LeverPostingsResponse } from "./types";

const fixturePath = join(__dirname, "fixtures", "postings-response.json");
const fixture = JSON.parse(
  readFileSync(fixturePath, "utf-8"),
) as LeverPostingsResponse;

const exampleCompany: Company = {
  id: "company-1",
  name: "Example Co",
  careersUrl: "https://jobs.lever.co/example",
  platform: "lever",
  logoUrl: null,
};

describe("isLeverCareersUrl", () => {
  it("matches jobs.lever.co URLs", () => {
    expect(isLeverCareersUrl("https://jobs.lever.co/example")).toBe(true);
    expect(isLeverCareersUrl("https://jobs.lever.co/example/posting-1")).toBe(
      true,
    );
  });

  it("matches EU Lever hosts and API hosts", () => {
    expect(isLeverCareersUrl("https://jobs.eu.lever.co/example")).toBe(true);
    expect(
      isLeverCareersUrl("https://api.lever.co/v0/postings/example?mode=json"),
    ).toBe(true);
    expect(
      isLeverCareersUrl("https://api.eu.lever.co/v0/postings/example"),
    ).toBe(true);
  });

  it("rejects non-Lever URLs", () => {
    expect(isLeverCareersUrl("https://boards.greenhouse.io/example")).toBe(
      false,
    );
    expect(isLeverCareersUrl("not-a-url")).toBe(false);
  });
});

describe("extractLeverSite", () => {
  it("extracts site from jobs.lever.co paths", () => {
    expect(extractLeverSite("https://jobs.lever.co/airbnb")).toEqual({
      site: "airbnb",
      region: "global",
    });
    expect(
      extractLeverSite("https://jobs.lever.co/airbnb/abc-123"),
    ).toEqual({
      site: "airbnb",
      region: "global",
    });
  });

  it("extracts EU region and API postings paths", () => {
    expect(extractLeverSite("https://jobs.eu.lever.co/acme")).toEqual({
      site: "acme",
      region: "eu",
    });
    expect(
      extractLeverSite("https://api.lever.co/v0/postings/acme?mode=json"),
    ).toEqual({
      site: "acme",
      region: "global",
    });
    expect(
      extractLeverSite("https://api.eu.lever.co/v0/postings/acme"),
    ).toEqual({
      site: "acme",
      region: "eu",
    });
  });

  it("returns null for non-Lever URLs", () => {
    expect(extractLeverSite("https://boards.greenhouse.io/example")).toBeNull();
  });
});

describe("extractLeverSiteFromHtml", () => {
  it("recovers site from embedded Lever API / jobs links", () => {
    expect(
      extractLeverSiteFromHtml(
        `<script src="https://api.lever.co/v0/postings/acme"></script>`,
      ),
    ).toEqual({ site: "acme", region: "global" });

    expect(
      extractLeverSiteFromHtml(
        `<a href="https://jobs.eu.lever.co/eu-co/role">Apply</a>`,
      ),
    ).toEqual({ site: "eu-co", region: "eu" });
  });
});

describe("buildLeverPostingsApiUrl", () => {
  it("builds global and EU paginated URLs", () => {
    expect(
      buildLeverPostingsApiUrl(
        { site: "acme", region: "global" },
        { skip: 100, limit: 50 },
      ),
    ).toBe(
      "https://api.lever.co/v0/postings/acme?mode=json&skip=100&limit=50",
    );

    expect(
      buildLeverPostingsApiUrl({ site: "acme", region: "eu" }, { limit: 10 }),
    ).toBe("https://api.eu.lever.co/v0/postings/acme?mode=json&limit=10");
  });
});

describe("parseLeverPostings", () => {
  it("maps fixture postings to valid RawJob objects", () => {
    const jobs = parseLeverPostings(fixture);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      sourcePlatform: "lever",
      sourceUrl: "https://jobs.lever.co/example/posting-1001",
      externalId: "posting-1001",
      raw: fixture[0],
    });
    expect(jobs[1]?.externalId).toBe("posting-1002");
    expect(jobs[1]?.sourceUrl).toBe(
      "https://jobs.lever.co/example/posting-1002",
    );
  });

  it("skips postings missing id or hostedUrl", () => {
    const jobs = parseLeverPostings([
      { text: "No id", hostedUrl: "https://jobs.lever.co/example/x" },
      { id: "only-id", text: "No url" },
      fixture[0]!,
    ]);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.externalId).toBe("posting-1001");
  });
});

describe("LeverConnector", () => {
  it("canHandle returns true for Lever careers URLs", () => {
    const connector = new LeverConnector();
    expect(connector.canHandle("https://jobs.lever.co/stripe")).toBe(true);
    expect(connector.canHandle("https://boards.greenhouse.io/stripe")).toBe(
      false,
    );
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

    const connector = new LeverConnector(mockFetch);
    const jobs = await connector.fetch(exampleCompany);

    expect(requestedUrl).toBe(
      "https://api.lever.co/v0/postings/example?mode=json&skip=0&limit=100",
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.sourcePlatform).toBe("lever");
    expect(jobs[0]?.externalId).toBe("posting-1001");
  });

  it("paginates until a short page is returned", async () => {
    const page1 = Array.from({ length: 100 }, (_, index) => ({
      id: `p-${index}`,
      text: `Role ${index}`,
      hostedUrl: `https://jobs.lever.co/example/p-${index}`,
    }));
    const page2 = [
      {
        id: "p-100",
        text: "Final role",
        hostedUrl: "https://jobs.lever.co/example/p-100",
      },
    ];

    const urls: string[] = [];
    const mockFetch: typeof fetch = async (input) => {
      urls.push(String(input));
      const url = new URL(String(input));
      const skip = Number(url.searchParams.get("skip") ?? "0");
      const body = skip === 0 ? page1 : page2;
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const connector = new LeverConnector(mockFetch);
    const jobs = await connector.fetch(exampleCompany);

    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain("skip=100");
    expect(jobs).toHaveLength(101);
  });

  it("recovers site from custom careers HTML when URL is not Lever", async () => {
    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url === "https://careers.example.com/jobs") {
        return new Response(
          `<script src="https://api.lever.co/v0/postings/acme"></script>`,
          { status: 200 },
        );
      }
      if (url.startsWith("https://api.lever.co/v0/postings/acme")) {
        return new Response(JSON.stringify(fixture), { status: 200 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const connector = new LeverConnector(mockFetch);
    const jobs = await connector.fetch({
      ...exampleCompany,
      careersUrl: "https://careers.example.com/jobs",
    });

    expect(jobs).toHaveLength(2);
  });

  it("throws when site cannot be resolved", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("<html><body>No lever links</body></html>", { status: 200 });

    const connector = new LeverConnector(mockFetch);
    await expect(
      connector.fetch({
        ...exampleCompany,
        careersUrl: "https://careers.example.com/jobs",
      }),
    ).rejects.toThrow(/Could not extract Lever site/);
  });

  it("throws on non-OK API responses", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("forbidden", { status: 403 });

    const connector = new LeverConnector(mockFetch);
    await expect(connector.fetch(exampleCompany)).rejects.toThrow(
      /Lever postings API request failed \(403\)/,
    );
  });
});

describe("ConnectorRegistry with Lever", () => {
  it("resolve picks Lever connector for jobs.lever.co URLs", async () => {
    const registry = createDefaultRegistry();
    const connector = await registry.resolve("https://jobs.lever.co/example");
    expect(connector?.platform).toBe("lever");
  });
});
