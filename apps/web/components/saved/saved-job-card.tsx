"use client";

import { Bookmark } from "lucide-react";
import { motion } from "framer-motion";

import { MatchScoreBadge } from "@/components/jobs/match-score-badge";
import type { SavedJobEntry, SavedJobStatus } from "@/lib/api/types";
import { formatPostedDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_ACCENT: Record<SavedJobStatus, string> = {
  interested: "border-l-[var(--accent-primary)]",
  applied: "border-l-[var(--state-success)]",
  rejected: "border-l-[var(--state-error)]",
};

interface SavedJobCardProps {
  entry: SavedJobEntry;
  isPending?: boolean;
  onDragStart: (entryId: string) => void;
  onDragEnd: () => void;
}

export function SavedJobCard({
  entry,
  isPending = false,
  onDragStart,
  onDragEnd,
}: SavedJobCardProps) {
  return (
    <motion.article
      layout
      draggable
      onDragStart={() => onDragStart(entry.id)}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isPending ? 0.7 : 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "cursor-grab rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] border-l-2 p-3 active:cursor-grabbing",
        STATUS_ACCENT[entry.status],
        isPending && "pointer-events-none",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {entry.job.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
            {entry.job.company.name}
          </p>
        </div>
        <MatchScoreBadge
          score={entry.job.matchScore}
          verdict={entry.job.matchVerdict}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
        {entry.job.location ? (
          <span className="truncate">{entry.job.location}</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Bookmark className="h-3 w-3" aria-hidden />
            Saved
          </span>
        )}
        <span aria-hidden>·</span>
        <span className="tabular-nums">
          {formatPostedDate(entry.job.postedAt ?? entry.job.firstSeenAt)}
        </span>
      </div>
    </motion.article>
  );
}
