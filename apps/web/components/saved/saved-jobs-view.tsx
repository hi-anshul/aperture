"use client";

import { useEffect, useMemo, useRef } from "react";

import { SavedKanbanColumn } from "@/components/saved/saved-kanban-column";
import type { SavedJobEntry, SavedJobStatus } from "@/lib/api/types";
import { useSavedJobsStore } from "@/lib/stores/saved-jobs-store";

const COLUMNS: SavedJobStatus[] = ["interested", "applied", "rejected"];

interface SavedJobsViewProps {
  initialSavedJobs: SavedJobEntry[];
}

export function SavedJobsView({ initialSavedJobs }: SavedJobsViewProps) {
  const items = useSavedJobsStore((state) => state.items);
  const pendingIds = useSavedJobsStore((state) => state.pendingIds);
  const error = useSavedJobsStore((state) => state.error);
  const setItems = useSavedJobsStore((state) => state.setItems);
  const updateStatus = useSavedJobsStore((state) => state.updateStatus);
  const clearError = useSavedJobsStore((state) => state.clearError);

  const draggingIdRef = useRef<string | null>(null);

  useEffect(() => {
    setItems(initialSavedJobs);
  }, [initialSavedJobs, setItems]);

  const columns = useMemo(() => {
    const grouped: Record<SavedJobStatus, SavedJobEntry[]> = {
      interested: [],
      applied: [],
      rejected: [],
    };

    for (const entry of items) {
      grouped[entry.status].push(entry);
    }

    return grouped;
  }, [items]);

  function handleDragStart(entryId: string) {
    draggingIdRef.current = entryId;
    clearError();
  }

  function handleDragEnd() {
    draggingIdRef.current = null;
  }

  function handleDrop(status: SavedJobStatus) {
    const entryId = draggingIdRef.current;
    draggingIdRef.current = null;

    if (!entryId) {
      return;
    }

    void updateStatus(entryId, status);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Saved
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Track jobs across Interested, Applied, and Rejected. Drag a card to
          update its status.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2"
        >
          <p className="text-xs text-[var(--state-error)]">{error}</p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-12">
          <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
            No saved jobs yet. Save a posting from the Jobs list or detail panel
            — it lands in Interested by default.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((status) => (
            <SavedKanbanColumn
              key={status}
              status={status}
              entries={columns[status]}
              pendingIds={pendingIds}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}
    </main>
  );
}
