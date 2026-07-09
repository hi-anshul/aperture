"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { PlatformBadge } from "@/components/companies/platform-badge";
import {
  clientRemoveFromWatchlist,
  clientUpdateWatchlistNotifications,
} from "@/lib/api/watchlists-client";
import type { WatchlistEntry } from "@/lib/api/types";
import {
  formatSyncStatus,
  formatSyncTimestamp,
} from "@/lib/companies/format";
import { cn } from "@/lib/utils";

interface WatchlistRowProps {
  entry: WatchlistEntry;
  onRemove: (watchlistId: string) => void;
  onNotificationsChange: (
    watchlistId: string,
    notificationsEnabled: boolean,
  ) => void;
}

export function WatchlistRow({
  entry,
  onRemove,
  onNotificationsChange,
}: WatchlistRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await clientRemoveFromWatchlist(entry.id);
      onRemove(entry.id);
    } catch {
      setError("Could not remove from watchlist. Try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleToggleNotifications() {
    if (isUpdating) {
      return;
    }

    const nextValue = !entry.notificationsEnabled;
    setIsUpdating(true);
    setError(null);

    try {
      const updated = await clientUpdateWatchlistNotifications(
        entry.id,
        nextValue,
      );
      onNotificationsChange(entry.id, updated.notificationsEnabled);
    } catch {
      setError("Could not update notifications. Try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <div className="mt-0.5 rounded-xl p-2 text-[var(--accent-primary)]">
        <Star className="h-4 w-4 fill-current" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {entry.company.name}
          </p>
          <PlatformBadge platform={entry.company.platform} />
        </div>

        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
          {entry.company.careersUrl}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
          <span>{formatSyncStatus(entry.company.lastSync?.status)}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {formatSyncTimestamp(
              entry.company.lastSync?.finishedAt ??
                entry.company.lastSync?.startedAt ??
                null,
            )}
          </span>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-xs text-[var(--text-secondary)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={entry.notificationsEnabled}
            onChange={handleToggleNotifications}
            disabled={isUpdating}
            className="size-4 rounded border-[var(--border-strong)] bg-[var(--bg-elevated)] accent-[var(--accent-primary)]"
          />
          Notifications
        </label>

        <button
          type="button"
          onClick={handleRemove}
          disabled={isUpdating}
          className={cn(
            "text-xs text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]",
            isUpdating && "opacity-50",
          )}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
