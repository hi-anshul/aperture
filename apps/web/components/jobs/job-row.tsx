"use client";

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
          "before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--accent-primary)]",
      )}
      aria-pressed={isSelected}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {job.title}
          </p>
          <MatchScoreBadge />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="truncate text-[var(--text-secondary)]">
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
