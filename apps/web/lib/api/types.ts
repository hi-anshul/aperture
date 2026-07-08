export interface JobCompany {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface JobListItem {
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
  company: JobCompany;
}

export interface JobsListResponse {
  jobs: JobListItem[];
  total: number;
}
