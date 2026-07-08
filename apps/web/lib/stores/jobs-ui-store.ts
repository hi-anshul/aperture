"use client";

import { create } from "zustand";

interface JobsUiState {
  selectedJobId: string | null;
  viewedJobIds: Record<string, true>;
  setSelectedJobId: (id: string | null) => void;
  markJobViewed: (id: string) => void;
  isJobNew: (id: string, firstSeenAt: string) => boolean;
}

const NEW_JOB_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const useJobsUiStore = create<JobsUiState>((set, get) => ({
  selectedJobId: null,
  viewedJobIds: {},

  setSelectedJobId: (id) => {
    set({ selectedJobId: id });
    if (id) {
      get().markJobViewed(id);
    }
  },

  markJobViewed: (id) => {
    set((state) => ({
      viewedJobIds: { ...state.viewedJobIds, [id]: true },
    }));
  },

  isJobNew: (id, firstSeenAt) => {
    if (get().viewedJobIds[id]) {
      return false;
    }

    const seenAt = new Date(firstSeenAt).getTime();
    if (Number.isNaN(seenAt)) {
      return false;
    }

    return Date.now() - seenAt <= NEW_JOB_WINDOW_MS;
  },
}));
