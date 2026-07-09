"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { PlatformBadge } from "@/components/companies/platform-badge";
import {
  clientAddToWatchlist,
  clientRemoveFromWatchlist,
} from "@/lib/api/watchlists-client";
import type { CompanyListItem } from "@/lib/api/types";
import {
  formatSyncStatus,
  formatSyncTimestamp,
} from "@/lib/companies/format";
import { cn } from "@/lib/utils";

interface CompanyRowProps {
  company: CompanyListItem;
  onWatchlistChange: (companyId: string, watchlist: CompanyListItem["watchlist"]) => void;
}

export function CompanyRow({ company, onWatchlistChange }: CompanyRowProps) {
  const isWatchlisted = company.watchlist !== null;
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleWatchlist() {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      if (isWatchlisted && company.watchlist) {
        await clientRemoveFromWatchlist(company.watchlist.id);
        onWatchlistChange(company.id, null);
      } else {
        const entry = await clientAddToWatchlist(company.id);
        onWatchlistChange(company.id, {
          id: entry.id,
          notificationsEnabled: entry.notificationsEnabled,
        });
      }
    } catch {
      setError(
        isWatchlisted
          ? "Could not remove from watchlist. Try again."
          : "Could not add to watchlist. Try again.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <button
        type="button"
        onClick={handleToggleWatchlist}
        disabled={isUpdating}
        aria-label={
          isWatchlisted
            ? `Remove ${company.name} from watchlist`
            : `Add ${company.name} to watchlist`
        }
        className={cn(
          "mt-0.5 rounded-xl p-2 transition hover:bg-[var(--bg-hover)]",
          isWatchlisted
            ? "text-[var(--accent-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        )}
      >
        <Star className={cn("h-4 w-4", isWatchlisted && "fill-current")} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {company.name}
          </p>
          <PlatformBadge platform={company.platform} />
        </div>

        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
          {company.careersUrl}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
          <span>{formatSyncStatus(company.lastSync?.status)}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {formatSyncTimestamp(company.lastSync?.finishedAt ?? company.lastSync?.startedAt ?? null)}
          </span>
          {company.lastSync ? (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">
                {company.lastSync.jobsFound} posting
                {company.lastSync.jobsFound === 1 ? "" : "s"}
              </span>
            </>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-xs text-[var(--text-secondary)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
