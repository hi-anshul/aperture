export interface WorkdayBoard {
  /** Tenant slug used in CXS paths, e.g. "adobe" or "pg" */
  tenant: string;
  /** Site / career site id, e.g. "external_experienced" or "1000" */
  site: string;
  /** Host including cluster, e.g. "adobe.wd5.myworkdayjobs.com" */
  host: string;
  /** Origin with scheme, e.g. "https://adobe.wd5.myworkdayjobs.com" */
  origin: string;
}

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

export interface WorkdayJobDetailResponse {
  jobPostingInfo?: WorkdayJobPostingInfo;
  [key: string]: unknown;
}

/** Combined listing + optional detail payload stored on RawJob.raw */
export interface WorkdayRawJobPayload {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
  jobPostingInfo?: WorkdayJobPostingInfo;
  [key: string]: unknown;
}
