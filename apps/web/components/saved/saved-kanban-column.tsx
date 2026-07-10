"use client";

import { useState } from "react";

import { SavedJobCard } from "@/components/saved/saved-job-card";
import type { SavedJobEntry, SavedJobStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const COLUMN_META: Record<
  SavedJobStatus,
  { label: string; accent: string; countAccent: string }
> = {
  interested: {
    label: "Interested",
    accent: "bg-[var(--accent-primary)]",
    countAccent: "text-[var(--accent-primary)]",
  },
  applied: {
    label: "Applied",
    accent: "bg-[var(--state-success)]",
    countAccent: "text-[var(--state-success)]",
  },
  rejected: {
    label: "Rejected",
    accent: "bg-[var(--state-error)]",
    countAccent: "text-[var(--state-error)]",
  },
};

interface SavedKanbanColumnProps {
  status: SavedJobStatus;
  entries: SavedJobEntry[];
  pendingIds: Record<string, true>;
  onDrop: (status: SavedJobStatus) => void;
  onDragStart: (entryId: string) => void;
  onDragEnd: () => void;
}

export function SavedKanbanColumn({
  status,
  entries,
  pendingIds,
  onDrop,
  onDragStart,
  onDragEnd,
}: SavedKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const meta = COLUMN_META[status];

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-[16rem] flex-1 flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]",
        isDragOver && "border-[var(--accent-primary)]",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        onDrop(status);
      }}
      aria-label={`${meta.label} column`}
    >
      <header className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-3">
        <span className={cn("h-2 w-2 rounded-full", meta.accent)} aria-hidden />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {meta.label}
        </h2>
        <span className={cn("ml-auto text-xs tabular-nums", meta.countAccent)}>
          {entries.length}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-[var(--text-muted)]">
            Drop jobs here
          </p>
        ) : (
          entries.map((entry) => (
            <SavedJobCard
              key={entry.id}
              entry={entry}
              isPending={Boolean(pendingIds[entry.id])}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}
