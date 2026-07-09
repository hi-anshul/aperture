import { describe, expect, it } from "vitest";
import { parseMatchResultPayload } from "./validate-match-result";

describe("parseMatchResultPayload", () => {
  it("parses a valid match payload", () => {
    const result = parseMatchResultPayload(
      JSON.stringify({
        score: 72.4,
        verdict: "good-match",
        missingSkills: ["Kubernetes", "kubernetes", "Go"],
        explanation: "Strong product background with some infra gaps.",
      }),
    );

    expect(result.score).toBe(72);
    expect(result.verdict).toBe("good-match");
    expect(result.missingSkills).toEqual(["Kubernetes", "Go"]);
    expect(result.explanation).toContain("product background");
  });

  it("accepts markdown-fenced JSON", () => {
    const result = parseMatchResultPayload(
      '```json\n{"score":40,"verdict":"weak-match","missingSkills":[],"explanation":"Limited overlap."}\n```',
    );
    expect(result.score).toBe(40);
    expect(result.verdict).toBe("weak-match");
  });

  it("rejects invalid JSON", () => {
    expect(() => parseMatchResultPayload("not-json")).toThrow(/invalid JSON/i);
  });

  it("rejects out-of-range scores", () => {
    expect(() =>
      parseMatchResultPayload(
        JSON.stringify({
          score: 150,
          verdict: "good-match",
          missingSkills: [],
          explanation: "Too high.",
        }),
      ),
    ).toThrow(/between 0 and 100/i);
  });

  it("rejects invalid verdicts", () => {
    expect(() =>
      parseMatchResultPayload(
        JSON.stringify({
          score: 50,
          verdict: "perfect",
          missingSkills: [],
          explanation: "Bad verdict.",
        }),
      ),
    ).toThrow(/invalid verdict/i);
  });

  it("rejects empty explanations", () => {
    expect(() =>
      parseMatchResultPayload(
        JSON.stringify({
          score: 50,
          verdict: "weak-match",
          missingSkills: [],
          explanation: "   ",
        }),
      ),
    ).toThrow(/empty explanation/i);
  });
});
