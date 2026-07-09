import { describe, expect, it } from "vitest";
import { parseExtractedResumeData } from "./validate-extracted-resume";

describe("parseExtractedResumeData", () => {
  it("parses a valid extraction payload", () => {
    const result = parseExtractedResumeData(
      JSON.stringify({
        skills: ["TypeScript", "Product Strategy", "typescript"],
        experience: [
          {
            company: "Acme",
            title: "PM",
            startDate: "2020",
            endDate: null,
            highlights: ["Shipped X"],
          },
          { company: "", title: "Ignored" },
        ],
        education: [
          {
            institution: "State U",
            degree: "BS",
            field: "CS",
            graduationYear: "2018",
          },
        ],
        keywords: ["B2B", "SaaS", "B2B"],
      }),
    );

    expect(result.skills).toEqual(["TypeScript", "Product Strategy"]);
    expect(result.keywords).toEqual(["B2B", "SaaS"]);
    expect(result.experience).toHaveLength(1);
    expect(result.experience[0]?.company).toBe("Acme");
    expect(result.education[0]?.institution).toBe("State U");
  });

  it("accepts markdown-fenced JSON", () => {
    const result = parseExtractedResumeData(
      '```json\n{"skills":["Go"],"experience":[],"education":[],"keywords":[]}\n```',
    );
    expect(result.skills).toEqual(["Go"]);
  });

  it("rejects empty skills and keywords", () => {
    expect(() =>
      parseExtractedResumeData(
        JSON.stringify({
          skills: [],
          experience: [],
          education: [],
          keywords: [],
        }),
      ),
    ).toThrow(/empty skills and keywords/i);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseExtractedResumeData("not-json")).toThrow(/invalid JSON/i);
  });
});
