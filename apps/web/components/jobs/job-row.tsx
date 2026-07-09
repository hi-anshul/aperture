"use client";

import { Star } from "lucide-react";
import { MatchScoreBadge } from "@/components/jobs/match-score-badge";
import type { JobListItem } from "@/lib/api/types";
import { formatPostedDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useJobsUiStore } from "@/lib/stores/jobs-ui-store";

const MAX_VISIBLE_TAGS = 2;

interface JobRowProps {
  job: JobListItem;
  isSelected: boolean;
  onSelect: (job: JobListItem) => void;
}

export function JobRow({ job, isSelected, onSelect }: JobRowProps) {
  const isJobNew = useJobsUiStore((state) => state.isJobNew);
  const isNew = isJobNew(job.id, job.firstSeenAt);
  const isWatchlistedNew = isNew && job.isFromWatchlistedCompany;
  const visibleTags = job.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = job.tags.length - visibleTags.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(job)}
      className={cn(
        "relative flex w-full items-center gap-4 px-4 py-3 text-left transition",
        "hover:bg-[var(--bg-hover)]",
        isSelected && "bg-[var(--bg-hover)]",
        isNew &&
          (isWatchlistedNew
            ? "before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--accent-primary)] before:shadow-[0_0_12px_var(--accent-primary)]"
            : "before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--accent-primary)]"),
      )}
      aria-pressed={isSelected}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {job.title}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {isWatchlistedNew ? (
              <span className="rounded-xl bg-[color-mix(in_oklch,var(--accent-primary),transparent_85%)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--accent-primary)]">
                Watchlisted
              </span>
            ) : null}
            <MatchScoreBadge
              score={job.matchScore}
              verdict={job.matchVerdict}
            />
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1 truncate text-[var(--text-secondary)]">
            {job.isFromWatchlistedCompany ? (
              <Star
                className="h-3 w-3 shrink-0 fill-[var(--accent-primary)] text-[var(--accent-primary)]"
                aria-label="Watchlisted company"
              />
            ) : null}
            {job.company.name}
          </span>
          {job.location ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{job.location}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {formatPostedDate(job.postedAt ?? job.firstSeenAt)}
          </span>
        </div>

        {visibleTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-xl bg-[var(--bg-elevated)] px-2 py-0.5 text-[0.65rem] text-[var(--text-secondary)]"
              >
                {tag}
              </span>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="rounded-xl bg-[var(--bg-elevated)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]">
                +{hiddenTagCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
