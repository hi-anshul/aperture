import { describe, expect, it } from "vitest";
import { parseExtractedResumeData } from "@aperture/ai";

/**
 * Smoke test that the API can consume the shared extraction validator.
 * Full upload flow is covered by service integration against a live DB.
 */
describe("resume extraction contract", () => {
  it("accepts a minimal valid payload shape used by ResumesService", () => {
    const data = parseExtractedResumeData(
      JSON.stringify({
        skills: ["React"],
        experience: [
          {
            company: "Acme",
            title: "Engineer",
            startDate: "2021-01",
            endDate: "Present",
            highlights: ["Built APIs"],
          },
        ],
        education: [
          {
            institution: "MIT",
            degree: "BS",
            field: "CS",
            graduationYear: "2020",
          },
        ],
        keywords: ["Full-stack"],
      }),
    );

    expect(data.skills).toContain("React");
    expect(data.keywords).toContain("Full-stack");
    expect(data.experience[0]?.title).toBe("Engineer");
    expect(data.education[0]?.institution).toBe("MIT");
  });
});
