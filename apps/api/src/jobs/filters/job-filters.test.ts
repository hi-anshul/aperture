import { describe, expect, it } from "vitest";
import { buildJobFilterConstraint } from "./job-filters";

describe("buildJobFilterConstraint", () => {
  it("returns undefined when no filters are provided", () => {
    expect(buildJobFilterConstraint({})).toBeUndefined();
  });

  it("builds a work mode filter", () => {
    expect(buildJobFilterConstraint({ workMode: "remote" })).toEqual({
      AND: [{ workMode: "remote" }],
    });
  });

  it("ignores invalid work mode values", () => {
    expect(
      buildJobFilterConstraint({ workMode: "invalid" as "remote" }),
    ).toBeUndefined();
  });

  it("combines multiple filters with AND semantics", () => {
    expect(
      buildJobFilterConstraint({
        workMode: "remote",
        country: "United States",
        visaSponsorship: true,
        employmentType: "full-time",
        platform: "greenhouse",
      }),
    ).toEqual({
      AND: [
        { workMode: "remote" },
        { country: { equals: "United States", mode: "insensitive" } },
        { sourcePlatform: "greenhouse" },
        { visaSponsorship: true },
        { employmentType: "full-time" },
      ],
    });
  });
});
