export const ANALYTICS_WINDOW_DAYS = [7, 30] as const;

export type AnalyticsWindowDays = (typeof ANALYTICS_WINDOW_DAYS)[number];

export const DEFAULT_ANALYTICS_WINDOW_DAYS: AnalyticsWindowDays = 7;

export interface AnalyticsQuery {
  windowDays: AnalyticsWindowDays;
}

function readQueryValue(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseAnalyticsQuery(
  raw: Record<string, string | string[] | undefined>,
): AnalyticsQuery {
  const rawDays = readQueryValue(raw, "windowDays")?.trim();
  if (rawDays === undefined || rawDays === "") {
    return { windowDays: DEFAULT_ANALYTICS_WINDOW_DAYS };
  }

  const parsed = Number(rawDays);
  if (
    Number.isInteger(parsed) &&
    (ANALYTICS_WINDOW_DAYS as readonly number[]).includes(parsed)
  ) {
    return { windowDays: parsed as AnalyticsWindowDays };
  }

  return { windowDays: DEFAULT_ANALYTICS_WINDOW_DAYS };
}
