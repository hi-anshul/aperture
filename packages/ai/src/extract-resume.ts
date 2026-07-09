import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedResumeData } from "@aperture/shared";
import { RESUME_EXTRACTION_SYSTEM_PROMPT } from "./prompts/resume-extraction";
import { parseExtractedResumeData } from "./validate-extracted-resume";

const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_RESUME_CHARS = 80_000;

export interface ExtractResumeOptions {
  apiKey?: string;
  model?: string;
  /** Injected for tests — when set, skips the live Anthropic call. */
  complete?: (prompt: string) => Promise<string>;
}

function buildUserPrompt(resumeText: string): string {
  const truncated =
    resumeText.length > MAX_RESUME_CHARS
      ? `${resumeText.slice(0, MAX_RESUME_CHARS)}\n\n[truncated]`
      : resumeText;

  return `Extract structured data from this resume text. Return JSON only.\n\n---\n${truncated}\n---`;
}

async function callClaude(
  resumeText: string,
  options: ExtractResumeOptions,
): Promise<string> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for resume extraction");
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: options.model ?? DEFAULT_MODEL,
    max_tokens: 4096,
    system: RESUME_EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(resumeText) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content for resume extraction");
  }

  return textBlock.text;
}

/**
 * Extract skills, experience, education, and keywords from plain resume text.
 * Output is schema-validated before return — never trust raw LLM JSON.
 */
export async function extractResumeFromText(
  resumeText: string,
  options: ExtractResumeOptions = {},
): Promise<ExtractedResumeData> {
  const trimmed = resumeText.trim();
  if (!trimmed) {
    throw new Error("Resume text is empty — cannot extract structured data");
  }

  const raw =
    options.complete != null
      ? await options.complete(buildUserPrompt(trimmed))
      : await callClaude(trimmed, options);

  return parseExtractedResumeData(raw);
}
