import { describe, expect, it } from "vitest";
import {
  buildCountryFilterConstraint,
  buildJobFilterConstraint,
} from "./job-filters";

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
    const constraint = buildJobFilterConstraint({
      workMode: "remote",
      country: "India",
      visaSponsorship: true,
      employmentType: "full-time",
      platform: "greenhouse",
    });

    expect(constraint).toEqual({
      AND: [
        { workMode: "remote" },
        {
          OR: [
            { country: { contains: "India", mode: "insensitive" } },
            { location: { contains: "India", mode: "insensitive" } },
          ],
        },
        { sourcePlatform: "greenhouse" },
        { visaSponsorship: true },
        { employmentType: "full-time" },
      ],
    });
  });
});

describe("buildCountryFilterConstraint", () => {
  it("matches country or location with contains", () => {
    expect(buildCountryFilterConstraint("India")).toEqual({
      OR: [
        { country: { contains: "India", mode: "insensitive" } },
        { location: { contains: "India", mode: "insensitive" } },
      ],
    });
  });

  it("expands United States aliases and US location prefixes", () => {
    const constraint = buildCountryFilterConstraint("United States");
    expect(constraint?.OR).toEqual(
      expect.arrayContaining([
        { country: { contains: "United States", mode: "insensitive" } },
        { location: { contains: "United States", mode: "insensitive" } },
        { country: { contains: "USA", mode: "insensitive" } },
        { location: { startsWith: "US -", mode: "insensitive" } },
        { country: { equals: "US", mode: "insensitive" } },
      ]),
    );
  });

  it("returns undefined for blank input", () => {
    expect(buildCountryFilterConstraint("   ")).toBeUndefined();
  });
});
