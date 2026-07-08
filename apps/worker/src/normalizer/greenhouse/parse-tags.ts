import type { GreenhouseDepartment, GreenhouseMetadataField, GreenhouseOffice } from "./types";

const RESERVED_METADATA_NAMES = new Set([
  "job posting location",
  "location",
  "country",
  "workplace type",
  "work type",
  "work location type",
  "employment type",
  "time type",
  "job type",
  "salary range",
  "compensation",
  "pay range",
  "base salary",
  "visa sponsorship",
  "work authorization",
]);

const MAX_TAG_LENGTH = 80;

export function parseGreenhouseTags(
  departments: GreenhouseDepartment[],
  offices: GreenhouseOffice[],
  metadata: GreenhouseMetadataField[],
): string[] {
  const tags = new Set<string>();

  for (const department of departments) {
    addTag(tags, department.name);
  }

  for (const office of offices) {
    addTag(tags, office.name);
  }

  for (const field of metadata) {
    const fieldName = normalizeText(field.name)?.toLowerCase();
    if (!fieldName || RESERVED_METADATA_NAMES.has(fieldName)) {
      continue;
    }

    addTag(tags, field.value);
  }

  return [...tags];
}

function addTag(tags: Set<string>, value: unknown): void {
  const normalized = normalizeText(value);
  if (!normalized) {
    return;
  }

  const tag =
    normalized.length > MAX_TAG_LENGTH
      ? normalized.slice(0, MAX_TAG_LENGTH)
      : normalized;

  tags.add(tag);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
