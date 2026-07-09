import Anthropic from "@anthropic-ai/sdk";
import type { MatchResult } from "@aperture/shared";
import { JOB_MATCHING_SYSTEM_PROMPT } from "./prompts/job-matching";
import { parseMatchResultPayload } from "./validate-match-result";

const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_DESCRIPTION_CHARS = 40_000;
const MAX_RESUME_SUMMARY_CHARS = 20_000;

export interface MatchJobInput {
  jobId: string;
  resumeId: string;
  jobTitle: string;
  jobDescription: string;
  jobLocation?: string | null;
  jobTags?: string[];
  /** Structured resume summary (skills, experience, keywords, etc.). */
  resumeSummary: string;
}

export interface MatchJobOptions {
  apiKey?: string;
  model?: string;
  /** Injected for tests — when set, skips the live Anthropic call. */
  complete?: (prompt: string) => Promise<string>;
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n\n[truncated]`;
}

export function buildMatchUserPrompt(input: MatchJobInput): string {
  const location = input.jobLocation?.trim() || "Not specified";
  const tags =
    input.jobTags && input.jobTags.length > 0
      ? input.jobTags.join(", ")
      : "None";

  return [
    "Score how well this candidate matches the job posting.",
    "Return JSON only.",
    "",
    "## Resume summary",
    truncate(input.resumeSummary.trim(), MAX_RESUME_SUMMARY_CHARS),
    "",
    "## Job posting",
    `Title: ${input.jobTitle.trim()}`,
    `Location: ${location}`,
    `Tags: ${tags}`,
    "",
    "Description:",
    truncate(input.jobDescription.trim(), MAX_DESCRIPTION_CHARS),
  ].join("\n");
}

/**
 * Build a compact resume summary string from structured resume fields.
 * Used by the worker when loading the active resume from the database.
 */
export function formatResumeSummary(resume: {
  skills: string[];
  keywords: string[];
  experience?: unknown;
  education?: unknown;
}): string {
  const lines: string[] = [];

  if (resume.skills.length > 0) {
    lines.push(`Skills: ${resume.skills.join(", ")}`);
  }
  if (resume.keywords.length > 0) {
    lines.push(`Keywords: ${resume.keywords.join(", ")}`);
  }

  if (Array.isArray(resume.experience) && resume.experience.length > 0) {
    lines.push("Experience:");
    for (const entry of resume.experience) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as Record<string, unknown>;
      const company =
        typeof record.company === "string" ? record.company : "Unknown";
      const title = typeof record.title === "string" ? record.title : "Unknown";
      const start =
        typeof record.startDate === "string" ? record.startDate : "?";
      const end =
        typeof record.endDate === "string" ? record.endDate : "present";
      lines.push(`- ${title} at ${company} (${start}–${end})`);
      if (Array.isArray(record.highlights)) {
        for (const highlight of record.highlights) {
          if (typeof highlight === "string" && highlight.trim()) {
            lines.push(`  • ${highlight.trim()}`);
          }
        }
      }
    }
  }

  if (Array.isArray(resume.education) && resume.education.length > 0) {
    lines.push("Education:");
    for (const entry of resume.education) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as Record<string, unknown>;
      const institution =
        typeof record.institution === "string"
          ? record.institution
          : "Unknown";
      const degree =
        typeof record.degree === "string" ? record.degree : null;
      const field = typeof record.field === "string" ? record.field : null;
      const year =
        typeof record.graduationYear === "string"
          ? record.graduationYear
          : null;
      const parts = [institution, degree, field, year].filter(Boolean);
      lines.push(`- ${parts.join(", ")}`);
    }
  }

  return lines.join("\n");
}

async function callClaude(
  userPrompt: string,
  options: MatchJobOptions,
): Promise<string> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for job matching");
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: options.model ?? DEFAULT_MODEL,
    max_tokens: 1024,
    system: JOB_MATCHING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content for job matching");
  }

  return textBlock.text;
}

/**
 * Score a job posting against a resume summary via Claude.
 * Output is schema-validated before return — never trust raw LLM JSON.
 */
export async function matchJobToResume(
  input: MatchJobInput,
  options: MatchJobOptions = {},
): Promise<MatchResult> {
  if (!input.jobId.trim()) {
    throw new Error("jobId is required for matching");
  }
  if (!input.resumeId.trim()) {
    throw new Error("resumeId is required for matching");
  }
  if (!input.jobTitle.trim()) {
    throw new Error("jobTitle is required for matching");
  }
  if (!input.jobDescription.trim()) {
    throw new Error("jobDescription is required for matching");
  }
  if (!input.resumeSummary.trim()) {
    throw new Error("resumeSummary is required for matching");
  }

  const userPrompt = buildMatchUserPrompt(input);
  const raw =
    options.complete != null
      ? await options.complete(userPrompt)
      : await callClaude(userPrompt, options);

  const payload = parseMatchResultPayload(raw);

  return {
    jobId: input.jobId,
    resumeId: input.resumeId,
    score: payload.score,
    verdict: payload.verdict,
    missingSkills: payload.missingSkills,
    explanation: payload.explanation,
  };
}
