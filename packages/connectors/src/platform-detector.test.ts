import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PlatformType } from "@aperture/shared";
import { describe, expect, it, vi } from "vitest";

import {
  detectPlatform,
  detectPlatformFromUrl,
  inspectPageContent,
} from "./platform-detector";
import {
  detectAndPersistPlatform,
  overrideCompanyPlatform,
  shouldDetectPlatform,
  type PlatformPersistenceClient,
} from "./platform-persistence";

const fixturesDir = join(__dirname, "fixtures");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("detectPlatformFromUrl", () => {
  it("matches Greenhouse URLs without a network call", () => {
    expect(detectPlatformFromUrl("https://boards.greenhouse.io/stripe")).toBe(
      "greenhouse",
    );
    expect(
      detectPlatformFromUrl("https://job-boards.greenhouse.io/example"),
    ).toBe("greenhouse");
  });

  it("matches Lever URLs", () => {
    expect(detectPlatformFromUrl("https://jobs.lever.co/stripe")).toBe("lever");
  });

  it("matches Ashby URLs", () => {
    expect(detectPlatformFromUrl("https://jobs.ashbyhq.com/acme")).toBe("ashby");
  });

  it("matches Workday URLs", () => {
    expect(
      detectPlatformFromUrl("https://acme.wd5.myworkdayjobs.com/en-US/careers"),
    ).toBe("workday");
    expect(
      detectPlatformFromUrl("https://myworkdayjobs.com/en-US/careers"),
    ).toBe("workday");
  });

  it("returns null for unrecognized URLs", () => {
    expect(detectPlatformFromUrl("https://example.com/careers")).toBeNull();
    expect(detectPlatformFromUrl("not-a-url")).toBeNull();
  });
});

describe("inspectPageContent", () => {
  it("detects Greenhouse signatures in embedded pages", () => {
    expect(inspectPageContent(readFixture("greenhouse-embed.html"))).toBe(
      "greenhouse",
    );
  });

  it("detects Lever signatures in embedded pages", () => {
    expect(inspectPageContent(readFixture("lever-embed.html"))).toBe("lever");
  });

  it("detects Ashby signatures in embedded pages", () => {
    expect(inspectPageContent(readFixture("ashby-embed.html"))).toBe("ashby");
  });

  it("detects Workday signatures in embedded pages", () => {
    expect(inspectPageContent(readFixture("workday-embed.html"))).toBe(
      "workday",
    );
  });

  it("detects static HTML job listings", () => {
    expect(inspectPageContent(readFixture("static-html-jobs.html"))).toBe(
      "static-html",
    );
  });

  it("detects JS-only SPA shells as react-rendered", () => {
    expect(inspectPageContent(readFixture("react-spa-shell.html"))).toBe(
      "react-rendered",
    );
  });

  it("returns unknown when nothing matches confidently", () => {
    expect(inspectPageContent(readFixture("unknown-page.html"))).toBe("unknown");
  });
});

describe("detectPlatform", () => {
  it("resolves known URLs without fetching", async () => {
    const fetchMock = vi.fn();
    const result = await detectPlatform("https://jobs.lever.co/acme", {
      fetch: fetchMock,
    });

    expect(result).toEqual({
      platform: "lever",
      source: "url-pattern",
      fetched: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to a single fetch and content inspection", async () => {
    const html = readFixture("static-html-jobs.html");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => html,
    })) as unknown as typeof fetch;

    const result = await detectPlatform("https://example.com/careers", {
      fetch: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      platform: "static-html",
      source: "content-inspection",
      fetched: true,
    });
  });

  it("returns unknown when fetch fails", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
    })) as unknown as typeof fetch;

    const result = await detectPlatform("https://example.com/careers", {
      fetch: fetchMock,
    });

    expect(result.platform).toBe("unknown");
    expect(result.fetched).toBe(true);
  });

  it("returns unknown when fetch throws", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network error");
    }) as unknown as typeof fetch;

    const result = await detectPlatform("https://example.com/careers", {
      fetch: fetchMock,
    });

    expect(result.platform).toBe("unknown");
    expect(result.fetched).toBe(true);
  });
});

describe("shouldDetectPlatform", () => {
  it("skips detection when a platform is already cached", () => {
    expect(shouldDetectPlatform("greenhouse")).toBe(false);
    expect(shouldDetectPlatform("lever")).toBe(false);
  });

  it("runs detection for unknown platforms", () => {
    expect(shouldDetectPlatform("unknown")).toBe(true);
  });

  it("re-runs detection when forced", () => {
    expect(shouldDetectPlatform("greenhouse", true)).toBe(true);
  });
});

describe("detectAndPersistPlatform", () => {
  it("persists detected platform to companies.platform", async () => {
    const updates: Array<{ id: string; platform: string }> = [];
    const client: PlatformPersistenceClient = {
      company: {
        findUnique: async () => ({
          id: "company-1",
          careersUrl: "https://jobs.lever.co/acme",
          platform: "unknown",
        }),
        update: async ({ where, data }) => {
          updates.push({ id: where.id, platform: data.platform });
          return {
            id: where.id,
            careersUrl: "https://jobs.lever.co/acme",
            platform: data.platform,
          };
        },
      },
    };

    const platform = await detectAndPersistPlatform("company-1", client);

    expect(platform).toBe("lever");
    expect(updates).toEqual([{ id: "company-1", platform: "lever" }]);
  });

  it("returns cached platform without re-detecting", async () => {
    const fetchMock = vi.fn();
    const client: PlatformPersistenceClient = {
      company: {
        findUnique: async () => ({
          id: "company-1",
          careersUrl: "https://example.com/careers",
          platform: "greenhouse",
        }),
        update: async () => {
          throw new Error("should not update");
        },
      },
    };

    const platform = await detectAndPersistPlatform("company-1", client, {
      fetch: fetchMock,
    });

    expect(platform).toBe("greenhouse");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("re-detects when forced", async () => {
    const html = readFixture("ashby-embed.html");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => html,
    })) as unknown as typeof fetch;

    const client: PlatformPersistenceClient = {
      company: {
        findUnique: async () => ({
          id: "company-1",
          careersUrl: "https://example.com/careers",
          platform: "greenhouse",
        }),
        update: async ({ where, data }) => ({
          id: where.id,
          careersUrl: "https://example.com/careers",
          platform: data.platform,
        }),
      },
    };

    const platform = await detectAndPersistPlatform("company-1", client, {
      fetch: fetchMock,
      force: true,
    });

    expect(platform).toBe("ashby");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("overrideCompanyPlatform", () => {
  it("sets platform directly without running detection", async () => {
    const fetchMock = vi.fn();
    const client: PlatformPersistenceClient = {
      company: {
        findUnique: async () => ({
          id: "company-1",
          careersUrl: "https://example.com/careers",
          platform: "unknown",
        }),
        update: async ({ where, data }) => ({
          id: where.id,
          careersUrl: "https://example.com/careers",
          platform: data.platform,
        }),
      },
    };

    const platform = await overrideCompanyPlatform(
      "company-1",
      "workday" as PlatformType,
      client,
    );

    expect(platform).toBe("workday");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
