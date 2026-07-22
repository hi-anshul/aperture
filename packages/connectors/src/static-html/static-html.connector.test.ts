import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Company } from "@aperture/shared";
import { describe, expect, it, vi } from "vitest";

import { createDefaultRegistry } from "../registry";
import {
  parseHtmlJobs,
  StaticHtmlConnector,
} from "./index";

const fixturePath = join(__dirname, "..", "fixtures", "static-html-jobs.html");
const fixtureHtml = readFileSync(fixturePath, "utf-8");
const flipkartFixturePath = join(
  __dirname,
  "..",
  "fixtures",
  "static-html-flipkart-style.html",
);
const flipkartFixtureHtml = readFileSync(flipkartFixturePath, "utf-8");

const exampleCompany: Company = {
  id: "company-1",
  name: "Example Co",
  careersUrl: "https://careers.example.com/open-roles",
  platform: "static-html",
  logoUrl: null,
};

describe("parseHtmlJobs", () => {
  it("extracts job listings from the static HTML fixture", () => {
    const jobs = parseHtmlJobs(fixtureHtml, {
      sourcePlatform: "static-html",
      baseUrl: exampleCompany.careersUrl,
    });

    expect(jobs).toHaveLength(3);
    expect(jobs[0]).toMatchObject({
      sourcePlatform: "static-html",
      sourceUrl: "https://careers.example.com/careers/software-engineer",
      externalId: "/careers/software-engineer",
      raw: expect.objectContaining({
        title: "Software Engineer",
      }),
    });
    expect(jobs[1]?.raw).toMatchObject({ title: "Product Manager" });
    expect(jobs[2]?.raw).toMatchObject({ title: "Designer" });
  });

  it("parses schema.org JobPosting JSON-LD", () => {
    const html = `<!DOCTYPE html><html><body>
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Staff Engineer",
          "url": "https://careers.example.com/jobs/staff-engineer",
          "description": "Build systems.",
          "jobLocation": { "address": { "addressLocality": "Remote" } }
        }
      </script>
    </body></html>`;

    const jobs = parseHtmlJobs(html, {
      sourcePlatform: "static-html",
      baseUrl: "https://careers.example.com/",
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      sourcePlatform: "static-html",
      sourceUrl: "https://careers.example.com/jobs/staff-engineer",
      externalId: "/jobs/staff-engineer",
      raw: {
        title: "Staff Engineer",
        location: "Remote",
        description: "Build systems.",
      },
    });
  });

  it("parses link-less job cards with heading titles (Flipkart-style)", () => {
    const jobs = parseHtmlJobs(flipkartFixtureHtml, {
      sourcePlatform: "static-html",
      baseUrl: "https://www.flipkartcareers.com/jobslist",
    });

    expect(jobs).toHaveLength(3);
    expect(jobs[0]).toMatchObject({
      sourcePlatform: "static-html",
      sourceUrl: "https://www.flipkartcareers.com/jobslist",
      externalId: "listing:manager-business-development-bangalore-karnataka",
      raw: {
        title: "Manager - Business Development",
        location: "Bangalore, Karnataka",
      },
    });
    expect(jobs[1]?.raw).toMatchObject({
      title: "Tech Lead - Software Development",
      location: "Bangalore, Karnataka",
    });
    expect(jobs[2]?.raw).toMatchObject({
      title: "Senior Business Analyst",
      location: "Hyderabad, Telangana",
    });
  });

  it("respects a custom selector map", () => {
    const html = `<ul class="roles"><li class="role"><a href="/r/1">Role One</a></li></ul>`;
    const jobs = parseHtmlJobs(html, {
      sourcePlatform: "static-html",
      baseUrl: "https://example.com/careers",
      selectors: {
        jobItem: ".role",
        title: "a",
        link: "a",
      },
    });

    expect(jobs).toEqual([
      expect.objectContaining({
        sourceUrl: "https://example.com/r/1",
        externalId: "/r/1",
        raw: expect.objectContaining({ title: "Role One" }),
      }),
    ]);
  });
});

describe("StaticHtmlConnector", () => {
  it("fetches HTML and returns RawJob[]", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(fixtureHtml, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const connector = new StaticHtmlConnector({ fetchFn });
    const jobs = await connector.fetch(exampleCompany);

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(jobs).toHaveLength(3);
    expect(jobs.every((job) => job.sourcePlatform === "static-html")).toBe(
      true,
    );
  });

  it("throws on non-OK HTTP responses", async () => {
    const fetchFn = vi.fn(
      async () => new Response("nope", { status: 503 }),
    );
    const connector = new StaticHtmlConnector({ fetchFn });

    await expect(connector.fetch(exampleCompany)).rejects.toThrow(
      /Static HTML careers page request failed \(503\)/,
    );
  });

  it("is selected via platform fallback, not URL resolve", async () => {
    const registry = createDefaultRegistry();
    const byUrl = await registry.resolve(exampleCompany.careersUrl);
    expect(byUrl).toBeUndefined();

    const byPlatform = registry
      .list()
      .find((entry) => entry.platform === "static-html");
    expect(byPlatform).toBeDefined();
  });
});
