"use client";

import { useState } from "react";
import { WatchlistRow } from "@/components/watchlist/watchlist-row";
import type { WatchlistEntry } from "@/lib/api/types";

interface WatchlistViewProps {
  initialWatchlists: WatchlistEntry[];
}

export function WatchlistView({ initialWatchlists }: WatchlistViewProps) {
  const [watchlists, setWatchlists] = useState(initialWatchlists);

  function handleRemove(watchlistId: string) {
    setWatchlists((current) => current.filter((entry) => entry.id !== watchlistId));
  }

  function handleNotificationsChange(
    watchlistId: string,
    notificationsEnabled: boolean,
  ) {
    setWatchlists((current) =>
      current.map((entry) =>
        entry.id === watchlistId
          ? { ...entry, notificationsEnabled }
          : entry,
      ),
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Watchlist
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Starred companies get priority in the notification pipeline. Toggle
          alerts per company here.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Starred companies
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {watchlists.length} compan{watchlists.length === 1 ? "y" : "ies"}{" "}
            on your watchlist
          </p>
        </div>

        {watchlists.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--text-secondary)]">
            No starred companies yet. Star a company from the Companies page to
            add it here.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {watchlists.map((entry) => (
              <WatchlistRow
                key={entry.id}
                entry={entry}
                onRemove={handleRemove}
                onNotificationsChange={handleNotificationsChange}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
