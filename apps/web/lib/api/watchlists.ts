import type { WatchlistsListResponse } from "./types";
import { serverFetch } from "./server";

export async function fetchWatchlists(): Promise<WatchlistsListResponse> {
  return serverFetch<WatchlistsListResponse>("/watchlists");
}
