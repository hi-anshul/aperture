export function formatPostedDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function resolveCurrencyCode(currency: string | null): string {
  const code = currency?.trim().toUpperCase() || "USD";

  try {
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    });
    return code;
  } catch {
    return "USD";
  }
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) {
    return null;
  }

  const code = resolveCurrencyCode(currency);
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  });

  if (min != null && max != null) {
    return `${formatter.format(min)} – ${formatter.format(max)}`;
  }

  if (min != null) {
    return `${formatter.format(min)}+`;
  }

  return `Up to ${formatter.format(max!)}`;
}

export function isWithinDays(isoDate: string, days: number): boolean {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return date.getTime() >= cutoff;
}
