import type { PlatformType } from "@aperture/shared";

import { detectPlatform, type DetectPlatformOptions } from "./platform-detector";

export interface CompanyPlatformRecord {
  id: string;
  careersUrl: string;
  platform: string;
}

export interface PlatformPersistenceClient {
  company: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; careersUrl: true; platform: true };
    }): Promise<CompanyPlatformRecord | null>;
    update(args: {
      where: { id: string };
      data: { platform?: string; name?: string };
    }): Promise<CompanyPlatformRecord>;
  };
}

export interface DetectAndPersistOptions extends DetectPlatformOptions {
  /** Re-run detection even when a non-unknown platform is already cached */
  force?: boolean;
}

/**
 * Returns true when auto-detection should run for this company.
 * Cached platforms are reused; only `unknown` (or forced re-runs) trigger detection.
 */
export function shouldDetectPlatform(
  currentPlatform: PlatformType,
  force = false,
): boolean {
  if (force) {
    return true;
  }
  return currentPlatform === "unknown";
}

/**
 * Detects the platform for a company and persists the result to `companies.platform`.
 * Skips detection when a non-unknown platform is already cached unless `force` is set.
 */
export async function detectAndPersistPlatform(
  companyId: string,
  client: PlatformPersistenceClient,
  options: DetectAndPersistOptions = {},
): Promise<PlatformType> {
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { id: true, careersUrl: true, platform: true },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const currentPlatform = company.platform as PlatformType;
  if (!shouldDetectPlatform(currentPlatform, options.force)) {
    return currentPlatform;
  }

  const { platform } = await detectPlatform(company.careersUrl, options);
  const updated = await client.company.update({
    where: { id: companyId },
    data: { platform },
  });

  return updated.platform as PlatformType;
}

/**
 * Manual platform override — sets `companies.platform` directly without auto-detection.
 * Used when auto-detection returns `unknown` or the company migrates ATS platforms.
 */
export async function overrideCompanyPlatform(
  companyId: string,
  platform: PlatformType,
  client: PlatformPersistenceClient,
): Promise<PlatformType> {
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { id: true, careersUrl: true, platform: true },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const updated = await client.company.update({
    where: { id: companyId },
    data: { platform },
  });

  return updated.platform as PlatformType;
}
