import type {
  ExtractedResumeData,
  ResumeEducationEntry,
  ResumeExperienceEntry,
} from "@aperture/shared";

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

function parseExperienceEntry(value: unknown): ResumeExperienceEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const company = asString(record.company);
  const title = asString(record.title);

  if (!company || !title) {
    return null;
  }

  return {
    company,
    title,
    startDate: asString(record.startDate),
    endDate: asString(record.endDate),
    highlights: asStringArray(record.highlights),
  };
}

function parseEducationEntry(value: unknown): ResumeEducationEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const institution = asString(record.institution);

  if (!institution) {
    return null;
  }

  return {
    institution,
    degree: asString(record.degree),
    field: asString(record.field),
    graduationYear: asString(record.graduationYear),
  };
}

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

/**
 * Parse and validate Claude resume-extraction output.
 * Throws if the payload is not usable JSON or yields no skills and no keywords.
 */
export function parseExtractedResumeData(raw: string): ExtractedResumeData {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripMarkdownFences(raw));
  } catch {
    throw new Error("Resume extraction returned invalid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Resume extraction returned a non-object payload");
  }

  const record = parsed as Record<string, unknown>;
  const skills = asStringArray(record.skills);
  const keywords = asStringArray(record.keywords);

  const experience = Array.isArray(record.experience)
    ? record.experience
        .map(parseExperienceEntry)
        .filter((entry): entry is ResumeExperienceEntry => entry !== null)
    : [];

  const education = Array.isArray(record.education)
    ? record.education
        .map(parseEducationEntry)
        .filter((entry): entry is ResumeEducationEntry => entry !== null)
    : [];

  if (skills.length === 0 && keywords.length === 0) {
    throw new Error(
      "Resume extraction produced empty skills and keywords — refusing to persist",
    );
  }

  return { skills, experience, education, keywords };
}
