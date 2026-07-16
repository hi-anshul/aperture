import { describe, expect, it } from "vitest";
import { parseAnalyticsQuery } from "./analytics-query.dto";

describe("parseAnalyticsQuery", () => {
  it("defaults to 7 days when windowDays is omitted", () => {
    expect(parseAnalyticsQuery({})).toEqual({ windowDays: 7 });
  });

  it("accepts 7 and 30", () => {
    expect(parseAnalyticsQuery({ windowDays: "7" })).toEqual({
      windowDays: 7,
    });
    expect(parseAnalyticsQuery({ windowDays: "30" })).toEqual({
      windowDays: 30,
    });
  });

  it("falls back to 7 for invalid values", () => {
    expect(parseAnalyticsQuery({ windowDays: "14" })).toEqual({
      windowDays: 7,
    });
    expect(parseAnalyticsQuery({ windowDays: "abc" })).toEqual({
      windowDays: 7,
    });
    expect(parseAnalyticsQuery({ windowDays: "" })).toEqual({
      windowDays: 7,
    });
  });
});
