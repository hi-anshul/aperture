"use client";

import type { EmploymentType, PlatformType, WorkMode } from "@aperture/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  EMPTY_JOB_FILTERS,
  type JobFiltersState,
} from "@/lib/jobs/filter-types";

interface JobFiltersStore extends JobFiltersState {
  setWorkMode: (workMode: WorkMode | null) => void;
  setCountry: (country: string) => void;
  setPlatform: (platform: PlatformType | null) => void;
  setVisaSponsorship: (visaSponsorship: boolean | null) => void;
  setEmploymentType: (employmentType: EmploymentType | null) => void;
  setSalaryMin: (salaryMin: string) => void;
  setSalaryMax: (salaryMax: string) => void;
  clearWorkMode: () => void;
  clearCountry: () => void;
  clearPlatform: () => void;
  clearVisaSponsorship: () => void;
  clearEmploymentType: () => void;
  clearSalary: () => void;
  clearAllFilters: () => void;
}

export const useJobFiltersStore = create<JobFiltersStore>()(
  persist(
    (set) => ({
      ...EMPTY_JOB_FILTERS,

      setWorkMode: (workMode) => set({ workMode }),
      setCountry: (country) => set({ country }),
      setPlatform: (platform) => set({ platform }),
      setVisaSponsorship: (visaSponsorship) => set({ visaSponsorship }),
      setEmploymentType: (employmentType) => set({ employmentType }),
      setSalaryMin: (salaryMin) => set({ salaryMin }),
      setSalaryMax: (salaryMax) => set({ salaryMax }),

      clearWorkMode: () => set({ workMode: null }),
      clearCountry: () => set({ country: "" }),
      clearPlatform: () => set({ platform: null }),
      clearVisaSponsorship: () => set({ visaSponsorship: null }),
      clearEmploymentType: () => set({ employmentType: null }),
      clearSalary: () => set({ salaryMin: "", salaryMax: "" }),
      clearAllFilters: () => set({ ...EMPTY_JOB_FILTERS }),
    }),
    {
      name: "aperture-job-filters",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        workMode: state.workMode,
        country: state.country,
        platform: state.platform,
        visaSponsorship: state.visaSponsorship,
        employmentType: state.employmentType,
        salaryMin: state.salaryMin,
        salaryMax: state.salaryMax,
      }),
    },
  ),
);
