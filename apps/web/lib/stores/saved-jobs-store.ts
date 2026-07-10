"use client";

import { create } from "zustand";

import {
  clientSaveJob,
  clientUpdateSavedJobStatus,
} from "@/lib/api/saved-jobs-client";
import type { SavedJobEntry, SavedJobStatus } from "@/lib/api/types";

interface SavedJobsState {
  items: SavedJobEntry[];
  pendingIds: Record<string, true>;
  error: string | null;
  setItems: (items: SavedJobEntry[]) => void;
  clearError: () => void;
  saveJob: (jobId: string) => Promise<SavedJobEntry>;
  updateStatus: (
    savedJobId: string,
    status: SavedJobStatus,
  ) => Promise<SavedJobEntry | null>;
}

export const useSavedJobsStore = create<SavedJobsState>((set, get) => ({
  items: [],
  pendingIds: {},
  error: null,

  setItems: (items) => {
    set({ items, error: null });
  },

  clearError: () => {
    set({ error: null });
  },

  saveJob: async (jobId) => {
    const existing = get().items.find((entry) => entry.job.id === jobId);
    if (existing) {
      return existing;
    }

    const created = await clientSaveJob(jobId, "interested");

    set((state) => {
      if (state.items.some((entry) => entry.id === created.id)) {
        return {
          items: state.items.map((entry) =>
            entry.id === created.id ? created : entry,
          ),
          error: null,
        };
      }

      return {
        items: [created, ...state.items],
        error: null,
      };
    });

    return created;
  },

  updateStatus: async (savedJobId, status) => {
    const previous = get().items.find((entry) => entry.id === savedJobId);
    if (!previous) {
      return null;
    }

    if (previous.status === status) {
      return previous;
    }

    // Optimistic move — reconcile with the API response (or roll back).
    set((state) => ({
      items: state.items.map((entry) =>
        entry.id === savedJobId ? { ...entry, status } : entry,
      ),
      pendingIds: { ...state.pendingIds, [savedJobId]: true },
      error: null,
    }));

    try {
      const updated = await clientUpdateSavedJobStatus(savedJobId, status);

      set((state) => {
        const { [savedJobId]: _removed, ...pendingIds } = state.pendingIds;
        return {
          items: state.items.map((entry) =>
            entry.id === savedJobId ? updated : entry,
          ),
          pendingIds,
          error: null,
        };
      });

      return updated;
    } catch (error) {
      set((state) => {
        const { [savedJobId]: _removed, ...pendingIds } = state.pendingIds;
        return {
          items: state.items.map((entry) =>
            entry.id === savedJobId ? previous : entry,
          ),
          pendingIds,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update saved job status",
        };
      });

      return null;
    }
  },
}));
