import type {
  NotificationChannel,
  SettingsResponse,
} from "./types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function clientFetchSettings(): Promise<SettingsResponse> {
  const response = await fetch("/api/settings", { cache: "no-store" });
  return parseJsonResponse<SettingsResponse>(response);
}

export async function clientUpdateSettings(input: {
  notificationChannel?: NotificationChannel;
  matchScoreThreshold?: number;
}): Promise<SettingsResponse> {
  const response = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<SettingsResponse>(response);
}
