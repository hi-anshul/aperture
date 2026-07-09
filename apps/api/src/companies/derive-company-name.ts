function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function deriveCompanyNameFromUrl(careersUrl: string): string {
  try {
    const url = new URL(careersUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (url.hostname.includes("greenhouse.io")) {
      if (pathParts[0] === "embed") {
        const forParam = url.searchParams.get("for");
        if (forParam) {
          return capitalize(forParam);
        }
      } else if (pathParts[0]) {
        return capitalize(pathParts[0]);
      }
    }

    if (url.hostname.includes("lever.co") && pathParts[0]) {
      return capitalize(pathParts[0]);
    }

    if (url.hostname.includes("ashbyhq.com") && pathParts[0]) {
      return capitalize(pathParts[0]);
    }

    const hostParts = url.hostname.replace(/^www\./, "").split(".");
    return capitalize(hostParts[0] ?? "Company");
  } catch {
    return "Unknown Company";
  }
}
