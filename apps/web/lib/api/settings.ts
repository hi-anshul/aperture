import type { SettingsResponse } from "./types";
import { serverFetch } from "./server";

export async function fetchSettings(): Promise<SettingsResponse> {
  return serverFetch<SettingsResponse>("/settings");
}
