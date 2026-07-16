import type { AnalyticsResponse, AnalyticsWindowDays } from "./types";
import { serverFetch } from "./server";

export async function fetchAnalytics(
  windowDays: AnalyticsWindowDays = 7,
): Promise<AnalyticsResponse> {
  return serverFetch<AnalyticsResponse>(
    `/analytics?windowDays=${windowDays}`,
  );
}
