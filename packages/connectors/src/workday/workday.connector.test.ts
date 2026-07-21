import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Company } from "@aperture/shared";
import { describe, expect, it } from "vitest";

import { createDefaultRegistry } from "../registry";
import {
  WorkdayConnector,
  extractWorkdayBoard,
  extractWorkdayBoardFromHtml,
  isWorkdayCareersUrl,
  parseWorkdayJobPostings,
  toWorkdayRawJob,
} from "./index";
import type {
  WorkdayBoard,
  WorkdayJobDetailResponse,
  WorkdayJobsListResponse,
} from "./types";

const listFixture = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "jobs-list-response.json"), "utf-8"),
) as WorkdayJobsListResponse;

const detailFixture = JSON.parse(
  readFileSync(
    join(__dirname, "fixtures", "job-detail-response.json"),
    "utf-8",
  ),
) as WorkdayJobDetailResponse;

const exampleBoard: WorkdayBoard = {
  tenant: "example",
  site: "careers",
  host: "example.wd5.myworkdayjobs.com",
  origin: "https://example.wd5.myworkdayjobs.com",
};

const exampleCompany: Company = {
  id: "company-1",
  name: "Example Co",
  careersUrl: "https://example.wd5.myworkdayjobs.com/careers",
  platform: "workday",
  logoUrl: null,
};

describe("isWorkdayCareersUrl", () => {
  it("matches *.myworkdayjobs.com URLs", () => {
    expect(
      isWorkdayCareersUrl("https://adobe.wd5.myworkdayjobs.com/external_experienced"),
    ).toBe(true);
    expect(isWorkdayCareersUrl("https://myworkdayjobs.com/en-US/careers")).toBe(
      true,
    );
  });

  it("rejects non-Workday URLs", () => {
    expect(isWorkdayCareersUrl("https://boards.greenhouse.io/example")).toBe(
      false,
    );
    expect(isWorkdayCareersUrl("not-a-url")).toBe(false);
  });
});

describe("extractWorkdayBoard", () => {
  it("extracts tenant and site from a simple careers path", () => {
    expect(
      extractWorkdayBoard(
        "https://adobe.wd5.myworkdayjobs.com/external_experienced",
      ),
    ).toEqual({
      tenant: "adobe",
      site: "external_experienced",
      host: "adobe.wd5.myworkdayjobs.com",
      origin: "https://adobe.wd5.myworkdayjobs.com",
    });
  });

  it("skips locale segments", () => {
    expect(
      extractWorkdayBoard(
        "https://pg.wd5.myworkdayjobs.com/en-US/1000",
      ),
    ).toEqual({
      tenant: "pg",
      site: "1000",
      host: "pg.wd5.myworkdayjobs.com",
      origin: "https://pg.wd5.myworkdayjobs.com",
    });
  });

  it("extracts tenant and site from a CXS path", () => {
    expect(
      extractWorkdayBoard(
        "https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs",
      ),
    ).toEqual({
      tenant: "adobe",
      site: "external_experienced",
      host: "adobe.wd5.myworkdayjobs.com",
      origin: "https://adobe.wd5.myworkdayjobs.com",
    });
  });
});

describe("extractWorkdayBoardFromHtml", () => {
  it("recovers board info from embedded myworkdayjobs links", () => {
    const html = `
      <a href="https://adobe.wd5.myworkdayjobs.com/external_experienced/job/San-Jose/Role_R1/apply">Apply</a>
    `;

    expect(extractWorkdayBoardFromHtml(html)).toEqual({
      tenant: "adobe",
      site: "external_experienced",
      host: "adobe.wd5.myworkdayjobs.com",
      origin: "https://adobe.wd5.myworkdayjobs.com",
    });
  });
});

describe("parseWorkdayJobPostings", () => {
  it("maps list + detail fixtures into RawJob objects", () => {
    const details = new Map<string, WorkdayJobDetailResponse>([
      ["/job/San-Jose/Software-Engineer_R100001", detailFixture],
    ]);

    const jobs = parseWorkdayJobPostings(
      exampleBoard,
      listFixture.jobPostings ?? [],
      details,
    );

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      sourcePlatform: "workday",
      sourceUrl:
        "https://example.wd5.myworkdayjobs.com/careers/job/San-Jose/Software-Engineer_R100001",
      externalId: "R100001",
      raw: {
        ...listFixture.jobPostings![0],
        jobPostingInfo: detailFixture.jobPostingInfo,
      },
    });
    expect(jobs[1]?.externalId).toBe("R100002");
    expect(jobs[1]?.sourceUrl).toBe(
      "https://example.wd5.myworkdayjobs.com/careers/job/Remote/Product-Manager_R100002",
    );
  });

  it("returns null from toWorkdayRawJob when path and ids are missing", () => {
    expect(toWorkdayRawJob(exampleBoard, { title: "No path" })).toBeNull();
  });
});

describe("WorkdayConnector", () => {
  it("canHandle returns true for Workday careers URLs", () => {
    const connector = new WorkdayConnector();
    expect(
      connector.canHandle("https://adobe.wd5.myworkdayjobs.com/external_experienced"),
    ).toBe(true);
    expect(connector.canHandle("https://boards.greenhouse.io/stripe")).toBe(
      false,
    );
  });

  it("fetch paginates the CXS list and hydrates job details", async () => {
    const requested: string[] = [];

    const mockFetch = async (url: string, init?: RequestInit) => {
      requested.push(`${init?.method ?? "GET"} ${url}`);

      if (url.endsWith("/jobs") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { offset: number };
        if (body.offset === 0) {
          return {
            ok: true,
            json: async () => listFixture,
          } as Response;
        }

        // Workday often returns total: 0 on later pages — must not stop early.
        return {
          ok: true,
          json: async () => ({ total: 0, jobPostings: [] }),
        } as Response;
      }

      if (url.includes("/job/San-Jose/Software-Engineer_R100001")) {
        return {
          ok: true,
          json: async () => detailFixture,
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ jobPostingInfo: { jobReqId: "R100002", title: "Product Manager", externalUrl: "https://example.wd5.myworkdayjobs.com/careers/job/Remote/Product-Manager_R100002" } }),
      } as Response;
    };

    const connector = new WorkdayConnector(mockFetch);
    const jobs = await connector.fetch(exampleCompany);

    expect(requested[0]).toBe(
      "POST https://example.wd5.myworkdayjobs.com/wday/cxs/example/careers/jobs",
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.sourcePlatform).toBe("workday");
    expect(jobs[0]?.externalId).toBe("R100001");
    expect(jobs[0]?.raw.jobPostingInfo).toBeDefined();
  });

  it("fetch keeps paginating when later pages report total 0", async () => {
    const offsets: number[] = [];

    const mockFetch = async (url: string, init?: RequestInit) => {
      if (url.endsWith("/jobs") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { offset: number };
        offsets.push(body.offset);

        if (body.offset === 0) {
          return {
            ok: true,
            json: async () => ({
              total: 40,
              jobPostings: Array.from({ length: 20 }, (_, i) => ({
                title: `Role ${i}`,
                externalPath: `/job/Loc/Role_${i}`,
                bulletFields: [`R${i}`],
              })),
            }),
          } as Response;
        }

        if (body.offset === 20) {
          return {
            ok: true,
            json: async () => ({
              total: 0,
              jobPostings: Array.from({ length: 20 }, (_, i) => ({
                title: `Role ${20 + i}`,
                externalPath: `/job/Loc/Role_${20 + i}`,
                bulletFields: [`R${20 + i}`],
              })),
            }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({ total: 0, jobPostings: [] }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ jobPostingInfo: { jobReqId: "R0", title: "Role" } }),
      } as Response;
    };

    const connector = new WorkdayConnector(mockFetch);
    const jobs = await connector.fetch(exampleCompany);

    expect(offsets).toEqual([0, 20]);
    expect(jobs).toHaveLength(40);
  });

  it("fetch resolves a custom careers domain via HTML board discovery", async () => {
    const mockFetch = async (url: string, init?: RequestInit) => {
      if (url === "https://careers.adobe.com/us/en/c/engineering-and-product-jobs") {
        return {
          ok: true,
          text: async () =>
            `<a href="https://adobe.wd5.myworkdayjobs.com/external_experienced/job/San-Jose/Role_R1/apply">Apply</a>`,
        } as Response;
      }

      if (url.endsWith("/jobs") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            total: 1,
            jobPostings: [
              {
                title: "Role",
                externalPath: "/job/San-Jose/Role_R1",
                bulletFields: ["R1"],
              },
            ],
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          jobPostingInfo: {
            jobReqId: "R1",
            title: "Role",
            externalUrl:
              "https://adobe.wd5.myworkdayjobs.com/external_experienced/job/San-Jose/Role_R1",
          },
        }),
      } as Response;
    };

    const connector = new WorkdayConnector(mockFetch);
    const jobs = await connector.fetch({
      ...exampleCompany,
      careersUrl: "https://careers.adobe.com/us/en/c/engineering-and-product-jobs",
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.externalId).toBe("R1");
  });

  it("fetch throws when board cannot be resolved", async () => {
    const mockFetch = async () =>
      ({
        ok: true,
        text: async () => "<html><body>No workday links</body></html>",
      }) as Response;

    const connector = new WorkdayConnector(mockFetch);

    await expect(
      connector.fetch({
        ...exampleCompany,
        careersUrl: "https://careers.example.com/jobs",
      }),
    ).rejects.toThrow(/Could not extract Workday board/);
  });

  it("fetch throws on non-OK CXS list response", async () => {
    const mockFetch = async () =>
      ({
        ok: false,
        status: 403,
      }) as Response;

    const connector = new WorkdayConnector(mockFetch);

    await expect(connector.fetch(exampleCompany)).rejects.toThrow(
      /Workday CXS list request failed \(403\)/,
    );
  });
});

describe("ConnectorRegistry with Workday", () => {
  it("resolve picks Workday connector for myworkdayjobs URLs", async () => {
    const registry = createDefaultRegistry();
    const connector = await registry.resolve(
      "https://adobe.wd5.myworkdayjobs.com/external_experienced",
    );

    expect(connector?.platform).toBe("workday");
  });
});
