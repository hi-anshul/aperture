import { describe, expect, it } from "vitest";
import { buildJobWhereClause } from "./build-job-query";
import { buildIlikeSearchConstraint } from "../search/build-ilike-search-constraint";

describe("buildJobWhereClause", () => {
  it("always scopes to active jobs", async () => {
    await expect(buildJobWhereClause({ filters: {} })).resolves.toEqual({
      AND: [{ isActive: true }],
    });
  });

  it("combines search and filters with AND semantics instead of replacing filters", async () => {
    const searchConstraint = buildIlikeSearchConstraint("stripe");
    const where = await buildJobWhereClause({
      filters: { workMode: "remote", country: "United States" },
      searchConstraint,
    });

    expect(where).toEqual({
      AND: [
        { isActive: true },
        {
          AND: [
            { workMode: "remote" },
            { country: { equals: "United States", mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { title: { contains: "stripe", mode: "insensitive" } },
            { location: { contains: "stripe", mode: "insensitive" } },
            {
              company: { name: { contains: "stripe", mode: "insensitive" } },
            },
          ],
        },
      ],
    });
  });
});
