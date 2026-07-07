export type PlatformType =
  | "greenhouse" | "lever" | "ashby" | "workday" | "smartrecruiters"
  | "static-html" | "react-rendered" | "linkedin" | "indeed" | "naukri" | "unknown";

export type EmploymentType = "full-time" | "part-time" | "contract" | "internship" | "temporary";
export type WorkMode = "remote" | "hybrid" | "onsite";

// Raw output straight from a connector, before normalization
export interface RawJob {
  sourcePlatform: PlatformType;
  sourceUrl: string;
  externalId: string;       // ID from the source platform, for de-duping
  raw: Record<string, unknown>; // untouched payload for debugging/reprocessing
}

// Canonical Job shape used everywhere after Phase 8 (Normalizer)
export interface NormalizedJob {
  id: string;
  externalId: string;
  sourcePlatform: PlatformType;
  sourceUrl: string;
  companyId: string;
  title: string;
  description: string;
  location: string | null;
  workMode: WorkMode | null;
  country: string | null;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  visaSponsorship: boolean | null;
  tags: string[];
  postedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string;
  careersUrl: string;
  platform: PlatformType;
  logoUrl: string | null;
}

export interface JobDiff {
  companyId: string;
  newJobs: NormalizedJob[];
  removedJobIds: string[];
  updatedJobs: NormalizedJob[];
}

export interface MatchResult {
  jobId: string;
  resumeId: string;
  score: number; // 0-100
  verdict: "good-match" | "weak-match";
  missingSkills: string[];
  explanation: string;
}
