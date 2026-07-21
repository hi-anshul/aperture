export interface WorkdayJobPosting {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
  [key: string]: unknown;
}

export interface WorkdayJobsListResponse {
  total?: number;
  jobPostings?: WorkdayJobPosting[];
  [key: string]: unknown;
}

export interface WorkdayJobPostingInfo {
  id?: string;
  title?: string;
  jobDescription?: string;
  location?: string;
  locationsText?: string;
  country?: string;
  timeType?: string;
  remoteType?: string;
  jobReqId?: string;
  postedOn?: string;
  startDate?: string;
  externalUrl?: string;
  [key: string]: unknown;
}

export interface WorkdayRawJobPayload {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
  jobPostingInfo?: WorkdayJobPostingInfo;
  sourceUrl?: string;
  [key: string]: unknown;
}
