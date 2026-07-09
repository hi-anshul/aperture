import { describe, expect, it } from "vitest";
import {
  buildMatchUserPrompt,
  formatResumeSummary,
  matchJobToResume,
} from "./match-job";

describe("formatResumeSummary", () => {
  it("formats skills, keywords, experience, and education", () => {
    const summary = formatResumeSummary({
      skills: ["TypeScript", "Product Strategy"],
      keywords: ["B2B", "SaaS"],
      experience: [
        {
          company: "Acme",
          title: "PM",
          startDate: "2020",
          endDate: null,
          highlights: ["Shipped X"],
        },
      ],
      education: [
        {
          institution: "State U",
          degree: "BS",
          field: "CS",
          graduationYear: "2018",
        },
      ],
    });

    expect(summary).toContain("Skills: TypeScript, Product Strategy");
    expect(summary).toContain("Keywords: B2B, SaaS");
    expect(summary).toContain("PM at Acme");
    expect(summary).toContain("Shipped X");
    expect(summary).toContain("State U, BS, CS, 2018");
  });
});

describe("matchJobToResume", () => {
  it("returns a validated MatchResult from injected completion", async () => {
    const result = await matchJobToResume(
      {
        jobId: "job-1",
        resumeId: "resume-1",
        jobTitle: "Product Manager",
        jobDescription: "Own roadmap and ship features.",
        jobLocation: "Remote",
        jobTags: ["product"],
        resumeSummary: "Skills: Product Strategy",
      },
      {
        complete: async () =>
          JSON.stringify({
            score: 68,
            verdict: "good-match",
            missingSkills: ["SQL"],
            explanation: "Solid product fit with a data gap.",
          }),
      },
    );

    expect(result).toEqual({
      jobId: "job-1",
      resumeId: "resume-1",
      score: 68,
      verdict: "good-match",
      missingSkills: ["SQL"],
      explanation: "Solid product fit with a data gap.",
    });
  });

  it("does not persist malformed AI output", async () => {
    await expect(
      matchJobToResume(
        {
          jobId: "job-1",
          resumeId: "resume-1",
          jobTitle: "Engineer",
          jobDescription: "Build things.",
          resumeSummary: "Skills: Go",
        },
        {
          complete: async () =>
            JSON.stringify({
              score: "hot",
              verdict: "good-match",
              missingSkills: [],
              explanation: "Nope.",
            }),
        },
      ),
    ).rejects.toThrow(/invalid score/i);
  });

  it("includes job and resume context in the user prompt", () => {
    const prompt = buildMatchUserPrompt({
      jobId: "job-1",
      resumeId: "resume-1",
      jobTitle: "Staff Engineer",
      jobDescription: "Lead platform work.",
      jobLocation: "SF",
      jobTags: ["platform"],
      resumeSummary: "Skills: Go",
    });

    expect(prompt).toContain("Staff Engineer");
    expect(prompt).toContain("Lead platform work.");
    expect(prompt).toContain("Skills: Go");
    expect(prompt).toContain("SF");
  });
});
