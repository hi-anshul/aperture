export type MatchVerdict = "good-match" | "weak-match";

/** Claude match payload before jobId/resumeId are attached. */
export interface ParsedMatchPayload {
  score: number;
  verdict: MatchVerdict;
  missingSkills: string[];
  explanation: string;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const text = asString(item);
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(text);
  }

  return result;
}

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function parseVerdict(value: unknown): MatchVerdict | null {
  if (value === "good-match" || value === "weak-match") {
    return value;
  }
  return null;
}

/**
 * Parse and validate Claude match-scoring output.
 * Throws if the payload is not usable JSON or fails the MatchResult schema.
 * Never persist raw LLM output without calling this first.
 */
export function parseMatchResultPayload(raw: string): ParsedMatchPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripMarkdownFences(raw));
  } catch {
    throw new Error("Match scoring returned invalid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Match scoring returned a non-object payload");
  }

  const record = parsed as Record<string, unknown>;
  const score = parseScore(record.score);
  const verdict = parseVerdict(record.verdict);
  const explanation = asString(record.explanation);
  const missingSkills = asStringArray(record.missingSkills);

  if (score === null) {
    throw new Error("Match scoring returned an invalid score");
  }

  if (score < 0 || score > 100) {
    throw new Error("Match scoring score must be between 0 and 100");
  }

  if (!verdict) {
    throw new Error("Match scoring returned an invalid verdict");
  }

  if (!explanation) {
    throw new Error("Match scoring returned an empty explanation");
  }

  return {
    score: Math.round(score),
    verdict,
    missingSkills,
    explanation,
  };
}
