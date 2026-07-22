import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Company } from "@aperture/shared";
import { describe, expect, it, vi } from "vitest";

import { createDefaultRegistry } from "../registry";
import { ReactRenderedConnector } from "./index";

const fixturePath = join(__dirname, "..", "fixtures", "static-html-jobs.html");
const fixtureHtml = readFileSync(fixturePath, "utf-8");

const exampleCompany: Company = {
  id: "company-spa",
  name: "SPA Co",
  careersUrl: "https://jobs.example.com/careers",
  platform: "react-rendered",
  logoUrl: null,
};

describe("ReactRenderedConnector", () => {
  it("uses browser fetch then reuses the static HTML parser", async () => {
    const browserFetchHtml = vi.fn(async () => fixtureHtml);
    const connector = new ReactRenderedConnector({ browserFetchHtml });

    const jobs = await connector.fetch(exampleCompany);

    expect(browserFetchHtml).toHaveBeenCalledWith(
      exampleCompany.careersUrl,
      exampleCompany.id,
    );
    expect(jobs).toHaveLength(3);
    expect(jobs.every((job) => job.sourcePlatform === "react-rendered")).toBe(
      true,
    );
    expect(jobs[0]).toMatchObject({
      sourceUrl: "https://jobs.example.com/careers/software-engineer",
      raw: expect.objectContaining({ title: "Software Engineer" }),
    });
  });

  it("registers only when browserFetchHtml is provided", () => {
    const withoutBrowser = createDefaultRegistry();
    expect(
      withoutBrowser.list().some((entry) => entry.platform === "react-rendered"),
    ).toBe(false);

    const withBrowser = createDefaultRegistry({
      browserFetchHtml: async () => fixtureHtml,
    });
    expect(
      withBrowser.list().some((entry) => entry.platform === "react-rendered"),
    ).toBe(true);
  });
});
