import type { EmploymentType } from "@aperture/shared";

import type { GreenhouseMetadataField } from "./types";

const EMPLOYMENT_TYPE_VALUES: Record<string, EmploymentType> = {
  "full-time": "full-time",
  "full time": "full-time",
  fulltime: "full-time",
  "part-time": "part-time",
  "part time": "part-time",
  parttime: "part-time",
  contract: "contract",
  contractor: "contract",
  internship: "internship",
  intern: "internship",
  temporary: "temporary",
  temp: "temporary",
};

export function parseGreenhouseEmploymentType(
  title: string | null,
  metadata: GreenhouseMetadataField[],
): EmploymentType | null {
  const metadataValue = findMetadataEmploymentType(metadata);
  if (metadataValue) {
    return metadataValue;
  }

  return parseEmploymentTypeFromTitle(title);
}

function findMetadataEmploymentType(
  metadata: GreenhouseMetadataField[],
): EmploymentType | null {
  for (const field of metadata) {
    const fieldName = normalizeText(field.name)?.toLowerCase() ?? "";
    if (
      !fieldName.includes("employment") &&
      !fieldName.includes("time type") &&
      !fieldName.includes("job type")
    ) {
      continue;
    }

    const mapped = mapEmploymentType(normalizeText(field.value));
    if (mapped) {
      return mapped;
    }
  }

  return null;
}

function parseEmploymentTypeFromTitle(title: string | null): EmploymentType | null {
  const normalizedTitle = normalizeText(title)?.toLowerCase() ?? "";
  if (!normalizedTitle) {
    return null;
  }

  if (/\b(intern(ship)?)\b/.test(normalizedTitle)) {
    return "internship";
  }

  if (/\b(contract|contractor|ftc|fixed[-\s]?term)\b/.test(normalizedTitle)) {
    return "contract";
  }

  if (/\b(part[-\s]?time)\b/.test(normalizedTitle)) {
    return "part-time";
  }

  if (/\b(temporary|temp)\b/.test(normalizedTitle)) {
    return "temporary";
  }

  return null;
}

function mapEmploymentType(value: string | null): EmploymentType | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().replace(/[_-]+/g, " ").trim();
  return EMPLOYMENT_TYPE_VALUES[normalized] ?? null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
