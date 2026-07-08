export function normalizeMatchText(value: string | null | undefined): string {
  if (value == null) {
    return "";
  }

  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildExternalIdKey(companyId: string, externalId: string): string {
  return `${companyId}:${externalId}`;
}

export function buildFuzzyKey(
  companyId: string,
  companyName: string,
  title: string,
  location: string | null,
): string {
  return [
    companyId,
    normalizeMatchText(companyName),
    normalizeMatchText(title),
    normalizeMatchText(location),
  ].join("|");
}

export function isFuzzyMatch(
  companyId: string,
  companyName: string,
  left: { title: string; location: string | null },
  right: { title: string; location: string | null },
): boolean {
  return (
    buildFuzzyKey(companyId, companyName, left.title, left.location) ===
    buildFuzzyKey(companyId, companyName, right.title, right.location)
  );
}
