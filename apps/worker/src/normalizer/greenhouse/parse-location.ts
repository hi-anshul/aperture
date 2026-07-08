import type { WorkMode } from "@aperture/shared";

import type { GreenhouseMetadataField, GreenhouseOffice } from "./types";

const WORK_MODE_ONLY_PATTERN =
  /^(remote|hybrid(?:\s*[-;]\s*(?:in-?office|on-?site|in-?person))?|on-?site|in-?office|in-?person)$/i;

const US_STATE_SUFFIX_PATTERN = /,\s*[A-Z]{2}$/;

export interface ParsedLocation {
  location: string | null;
  workMode: WorkMode | null;
  country: string | null;
}

export function parseGreenhouseLocation(
  locationName: string | null,
  offices: GreenhouseOffice[],
  metadata: GreenhouseMetadataField[],
): ParsedLocation {
  const metadataLocation = findMetadataValue(metadata, [
    "job posting location",
    "location",
    "country",
  ]);
  const workMode = parseWorkMode(locationName, metadata);
  const displayLocation = resolveDisplayLocation(
    locationName,
    metadataLocation,
    offices,
  );
  const country = parseCountry(locationName, metadataLocation, offices);

  return {
    location: displayLocation,
    workMode,
    country,
  };
}

function resolveDisplayLocation(
  locationName: string | null,
  metadataLocation: string | null,
  offices: GreenhouseOffice[],
): string | null {
  const primary = normalizeText(locationName);
  const fromMetadata = normalizeText(metadataLocation);

  if (primary && !WORK_MODE_ONLY_PATTERN.test(primary)) {
    return primary;
  }

  if (fromMetadata) {
    return fromMetadata;
  }

  const officeLocation = offices
    .map((office) => normalizeText(office.location ?? office.name))
    .find(Boolean);

  if (officeLocation) {
    return officeLocation;
  }

  if (primary) {
    return primary;
  }

  return null;
}

function parseWorkMode(
  locationName: string | null,
  metadata: GreenhouseMetadataField[],
): WorkMode | null {
  const candidates = [
    locationName,
    findMetadataValue(metadata, [
      "workplace type",
      "work type",
      "work location type",
    ]),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const normalized = candidate.trim().toLowerCase();

    if (/\bremote\b/.test(normalized)) {
      return "remote";
    }

    if (/\bhybrid\b/.test(normalized)) {
      return "hybrid";
    }

    if (/\b(on-?site|in-?office|in-?person)\b/.test(normalized)) {
      return "onsite";
    }
  }

  return null;
}

function parseCountry(
  locationName: string | null,
  metadataLocation: string | null,
  offices: GreenhouseOffice[],
): string | null {
  const metadataCountry = extractCountryFromText(metadataLocation);
  if (metadataCountry) {
    return metadataCountry;
  }

  for (const office of offices) {
    const fromOffice = extractCountryFromText(
      office.location ?? office.name ?? null,
    );
    if (fromOffice) {
      return fromOffice;
    }
  }

  return extractCountryFromText(locationName);
}

function extractCountryFromText(value: string | null): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (WORK_MODE_ONLY_PATTERN.test(normalized)) {
    return null;
  }

  const segments = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const lastSegment = segments.at(-1);
  if (!lastSegment) {
    return null;
  }

  if (segments.length === 1) {
    if (lastSegment.length === 2 && /^[A-Z]{2}$/.test(lastSegment)) {
      return null;
    }

    if (looksLikeCountry(lastSegment)) {
      return lastSegment;
    }

    return null;
  }

  if (US_STATE_SUFFIX_PATTERN.test(normalized)) {
    return null;
  }

  if (lastSegment.length === 2 && /^[A-Z]{2}$/.test(lastSegment)) {
    return null;
  }

  if (looksLikeCountry(lastSegment)) {
    return lastSegment;
  }

  return null;
}

function looksLikeCountry(value: string): boolean {
  return value.length > 2 || value === "UK";
}

function findMetadataValue(
  metadata: GreenhouseMetadataField[],
  names: string[],
): string | null {
  const lookup = new Set(names.map((name) => name.toLowerCase()));

  for (const field of metadata) {
    const fieldName = normalizeText(field.name)?.toLowerCase();
    if (!fieldName || !lookup.has(fieldName)) {
      continue;
    }

    const value = normalizeText(field.value);
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
