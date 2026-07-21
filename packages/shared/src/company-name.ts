import { URL } from "node:url";

function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Subdomains that are careers portals, not the company brand. */
const GENERIC_HOST_LABELS = new Set([
  "www",
  "careers",
  "career",
  "jobs",
  "job",
  "recruiting",
  "recruitment",
  "talent",
  "apply",
  "boards",
  "job-boards",
]);

const WORKDAY_TENANT_HOST =
  /^([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com$/i;

/**
 * Derive a human-readable company name from a careers URL.
 * Prefer ATS board tokens / Workday tenants over generic host labels like "careers".
 */
export function deriveCompanyNameFromUrl(careersUrl: string): string {
  try {
    const url = new URL(careersUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname.includes("greenhouse.io")) {
      if (pathParts[0] === "embed") {
        const forParam = url.searchParams.get("for");
        if (forParam) {
          return capitalize(forParam);
        }
      } else if (pathParts[0]) {
        return capitalize(pathParts[0]);
      }
    }

    if (hostname.includes("lever.co") && pathParts[0]) {
      return capitalize(pathParts[0]);
    }

    if (hostname.includes("ashbyhq.com") && pathParts[0]) {
      return capitalize(pathParts[0]);
    }

    const workdayTenant = extractWorkdayTenantFromHost(hostname);
    if (workdayTenant) {
      return capitalize(workdayTenant);
    }

    const hostParts = hostname.split(".").filter(Boolean);
    if (hostParts.length >= 3 && GENERIC_HOST_LABELS.has(hostParts[0]!)) {
      return capitalize(hostParts[1]!);
    }

    return capitalize(hostParts[0] ?? "Company");
  } catch {
    return "Unknown Company";
  }
}

/** Names that are clearly not a real company brand (safe to overwrite on sync). */
export function isPlaceholderCompanyName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    GENERIC_HOST_LABELS.has(normalized) ||
    normalized === "workday" ||
    normalized === "myworkdayjobs" ||
    normalized === "unknown company" ||
    normalized === "company" ||
    normalized === "external" ||
    normalized === "external_experienced" ||
    normalized.length === 0
  );
}

export function formatCompanyNameFromSlug(slug: string): string {
  return capitalize(slug.trim());
}

export function extractWorkdayTenantFromHost(hostname: string): string | null {
  const match = WORKDAY_TENANT_HOST.exec(hostname.replace(/^www\./i, ""));
  return match?.[1] ?? null;
}
