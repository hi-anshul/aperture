import type {
  WatchlistEntry,
  WatchlistsListResponse,
} from "./types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function clientFetchWatchlists(): Promise<WatchlistsListResponse> {
  const response = await fetch("/api/watchlists", { cache: "no-store" });
  return parseJsonResponse<WatchlistsListResponse>(response);
}

export async function clientAddToWatchlist(
  companyId: string,
): Promise<WatchlistEntry> {
  const response = await fetch("/api/watchlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId }),
  });

  return parseJsonResponse<WatchlistEntry>(response);
}

export async function clientRemoveFromWatchlist(
  watchlistId: string,
): Promise<void> {
  const response = await fetch(`/api/watchlists/${watchlistId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }
}

export async function clientUpdateWatchlistNotifications(
  watchlistId: string,
  notificationsEnabled: boolean,
): Promise<WatchlistEntry> {
  const response = await fetch(`/api/watchlists/${watchlistId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationsEnabled }),
  });

  return parseJsonResponse<WatchlistEntry>(response);
}
