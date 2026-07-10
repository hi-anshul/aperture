export interface JobCompany {
  id: string;
  name: string;
  logoUrl: string | null;
}

export type MatchVerdict = "good-match" | "weak-match";

export interface JobMatchFields {
  matchScore: number | null;
  matchVerdict: MatchVerdict | null;
  matchMissingSkills: string[];
  matchExplanation: string | null;
  matchedResumeId: string | null;
  matchedAt: string | null;
}

export type SavedJobStatus = "interested" | "applied" | "rejected";

export interface JobSavedSummary {
  id: string;
  status: SavedJobStatus;
}

export interface JobListItem extends JobMatchFields {
  id: string;
  externalId: string;
  title: string;
  location: string | null;
  workMode: string | null;
  country: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  visaSponsorship: boolean | null;
  tags: string[];
  sourceUrl: string;
  sourcePlatform: string;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isFromWatchlistedCompany: boolean;
  savedJob: JobSavedSummary | null;
  company: JobCompany;
}

export interface SavedJobEntry {
  id: string;
  status: SavedJobStatus;
  createdAt: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    workMode: string | null;
    sourceUrl: string;
    sourcePlatform: string;
    matchScore: number | null;
    matchVerdict: MatchVerdict | null;
    postedAt: string | null;
    firstSeenAt: string;
    company: JobCompany;
  };
}

export interface SavedJobsListResponse {
  savedJobs: SavedJobEntry[];
  total: number;
}

export interface JobDetail extends JobListItem {
  description: string;
  isActive: boolean;
  aiSummary: null;
}

export interface JobRescoreResponse {
  jobId: string;
  status: "queued";
  resumeId: string;
}

export interface JobsListResponse {
  jobs: JobListItem[];
  total: number;
}

export interface CompanySyncSummary {
  startedAt: string;
  finishedAt: string | null;
  status: string;
  jobsFound: number;
  jobsNew: number;
  jobsRemoved: number;
}

export interface CompanyWatchlistSummary {
  id: string;
  notificationsEnabled: boolean;
}

export interface CompanyListItem {
  id: string;
  name: string;
  careersUrl: string;
  platform: string;
  logoUrl: string | null;
  createdAt: string;
  lastSync: CompanySyncSummary | null;
  watchlist: CompanyWatchlistSummary | null;
}

export interface CompaniesListResponse {
  companies: CompanyListItem[];
  total: number;
}

export interface WatchlistEntry {
  id: string;
  notificationsEnabled: boolean;
  createdAt: string;
  company: Omit<CompanyListItem, "createdAt" | "watchlist">;
}

export interface WatchlistsListResponse {
  watchlists: WatchlistEntry[];
  total: number;
}

export interface ResumeExperienceEntry {
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  highlights: string[];
}

export interface ResumeEducationEntry {
  institution: string;
  degree: string | null;
  field: string | null;
  graduationYear: string | null;
}

export interface ResumeResponse {
  id: string;
  fileUrl: string;
  skills: string[];
  experience: ResumeExperienceEntry[];
  education: ResumeEducationEntry[];
  keywords: string[];
  uploadedAt: string;
}

export type NotificationChannel = "email" | "push" | "telegram";

export interface SettingsResponse {
  notificationChannel: NotificationChannel;
  matchScoreThreshold: number;
}
