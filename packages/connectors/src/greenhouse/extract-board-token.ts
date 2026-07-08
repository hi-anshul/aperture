const GREENHOUSE_HOST_PATTERN = /(^|\.)greenhouse\.io$/i;

export function isGreenhouseCareersUrl(careersUrl: string): boolean {
  try {
    const { hostname } = new URL(careersUrl);
    return GREENHOUSE_HOST_PATTERN.test(hostname);
  } catch {
    return false;
  }
}

export function extractBoardToken(careersUrl: string): string | null {
  if (!isGreenhouseCareersUrl(careersUrl)) {
    return null;
  }

  const url = new URL(careersUrl);

  const forParam = url.searchParams.get("for");
  if (forParam) {
    return forParam;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  if (segments[0] === "embed") {
    return null;
  }

  return segments[0];
}
