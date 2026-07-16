import { describe, expect, it } from "vitest";
import { parseListJobsQuery } from "./list-jobs-query.dto";

describe("parseListJobsQuery", () => {
  it("parses search and filter query params", () => {
    expect(
      parseListJobsQuery({
        q: "  stripe ",
        workMode: "remote",
        country: "United States",
        platform: "greenhouse",
        visaSponsorship: "true",
        employmentType: "full-time",
        salaryMin: "120000",
        salaryMax: "180000",
      }),
    ).toEqual({
      q: "stripe",
      page: 1,
      limit: 20,
      workMode: "remote",
      country: "United States",
      platform: "greenhouse",
      visaSponsorship: true,
      employmentType: "full-time",
      salaryMin: 120000,
      salaryMax: 180000,
    });
  });

  it("drops invalid filter values", () => {
    expect(
      parseListJobsQuery({
        workMode: "onsite-ish",
        employmentType: "freelance",
        visaSponsorship: "maybe",
        salaryMin: "not-a-number",
      }),
    ).toEqual({
      q: undefined,
      page: 1,
      limit: 20,
      workMode: undefined,
      country: undefined,
      platform: undefined,
      visaSponsorship: undefined,
      employmentType: undefined,
      salaryMin: undefined,
      salaryMax: undefined,
    });
  });

  it("parses page and limit with defaults and caps", () => {
    expect(parseListJobsQuery({ page: "3", limit: "10" })).toMatchObject({
      page: 3,
      limit: 10,
    });
    expect(parseListJobsQuery({ page: "0", limit: "999" })).toMatchObject({
      page: 1,
      limit: 50,
    });
  });
});
