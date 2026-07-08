import { describe, expect, it } from "vitest";
import { buildIlikeSearchConstraint } from "./build-ilike-search-constraint";

describe("buildIlikeSearchConstraint", () => {
  it("returns undefined for blank search input", () => {
    expect(buildIlikeSearchConstraint("   ")).toBeUndefined();
  });

  it("matches partial titles, locations, and company names", () => {
    expect(buildIlikeSearchConstraint("product")).toEqual({
      OR: [
        { title: { contains: "product", mode: "insensitive" } },
        { location: { contains: "product", mode: "insensitive" } },
        { company: { name: { contains: "product", mode: "insensitive" } } },
      ],
    });
  });

  it("includes tag matches when job ids are provided", () => {
    expect(buildIlikeSearchConstraint("typescript", ["job-1", "job-2"])).toEqual(
      {
        OR: [
          { title: { contains: "typescript", mode: "insensitive" } },
          { location: { contains: "typescript", mode: "insensitive" } },
          {
            company: { name: { contains: "typescript", mode: "insensitive" } },
          },
          { id: { in: ["job-1", "job-2"] } },
        ],
      },
    );
  });
});
