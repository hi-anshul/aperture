"use client";

import { useState } from "react";
import { RefreshCw, Star, Trash2 } from "lucide-react";
import { PlatformBadge } from "@/components/companies/platform-badge";
import {
  clientDeleteCompany,
  clientFetchCompanies,
  clientSyncCompany,
} from "@/lib/api/companies-client";
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
  onWatchlistChange: (
    companyId: string,
    watchlist: CompanyListItem["watchlist"],
  ) => void;
  onRemoved: (companyId: string) => void;
  onCompanyUpdated: (company: CompanyListItem) => void;
}

export function CompanyRow({
  company,
  onWatchlistChange,
  onRemoved,
  onCompanyUpdated,
}: CompanyRowProps) {
  const isWatchlisted = company.watchlist !== null;
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const busy = isUpdating || isSyncing || isRemoving;

  async function handleToggleWatchlist() {
    if (busy) {
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSyncMessage(null);

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

  async function handleSync() {
    if (busy) {
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncMessage(null);

    try {
      await clientSyncCompany(company.id);
      setSyncMessage("Sync queued — refreshing status…");

      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const { companies } = await clientFetchCompanies();
        const refreshed = companies.find((item) => item.id === company.id);
        if (!refreshed) {
          break;
        }

        const previousStarted = company.lastSync?.startedAt ?? null;
        const nextStarted = refreshed.lastSync?.startedAt ?? null;
        if (nextStarted && nextStarted !== previousStarted) {
          onCompanyUpdated(refreshed);
          setSyncMessage(
            refreshed.lastSync?.status === "failed"
              ? "Sync finished with an error — check the worker logs."
              : "Sync finished.",
          );
          return;
        }
      }

      setSyncMessage("Sync still running — refresh the page in a moment.");
    } catch {
      setError("Could not start sync. Is Redis configured and the worker running?");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleRemove() {
    if (busy) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${company.name} from tracking? Its jobs and sync history will be deleted.`,
    );
    if (!confirmed) {
      return;
    }

    setIsRemoving(true);
    setError(null);
    setSyncMessage(null);

    try {
      await clientDeleteCompany(company.id);
      onRemoved(company.id);
    } catch {
      setError("Could not remove this company. Try again.");
      setIsRemoving(false);
    }
  }

  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <button
        type="button"
        onClick={handleToggleWatchlist}
        disabled={busy}
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
          busy && "opacity-50",
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
            {formatSyncTimestamp(
              company.lastSync?.finishedAt ??
                company.lastSync?.startedAt ??
                null,
            )}
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
          <p role="alert" className="mt-2 text-xs text-[var(--state-error)]">
            {error}
          </p>
        ) : null}

        {syncMessage ? (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {syncMessage}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleSync}
          disabled={busy}
          aria-label={`Sync ${company.name}`}
          title="Sync now"
          className={cn(
            "rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]",
            busy && "opacity-50",
          )}
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        </button>

        <button
          type="button"
          onClick={handleRemove}
          disabled={busy}
          aria-label={`Remove ${company.name}`}
          title="Remove company"
          className={cn(
            "rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--accent-danger)]",
            busy && "opacity-50",
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
