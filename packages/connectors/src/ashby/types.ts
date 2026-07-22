export interface AshbyBoard {
  /** Job board slug, e.g. "Ashby" or "ramp" */
  boardName: string;
}

export interface AshbyPostalAddress {
  addressLocality?: string | null;
  addressRegion?: string | null;
  addressCountry?: string | null;
  [key: string]: unknown;
}

export interface AshbyAddress {
  postalAddress?: AshbyPostalAddress | null;
  [key: string]: unknown;
}

export interface AshbySecondaryLocation {
  location?: string | null;
  address?: AshbyAddress | null;
  [key: string]: unknown;
}

export interface AshbyCompensationComponent {
  id?: string;
  summary?: string | null;
  compensationType?: string | null;
  interval?: string | null;
  currencyCode?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  [key: string]: unknown;
}

export interface AshbyCompensationTier {
  id?: string;
  tierSummary?: string | null;
  title?: string | null;
  components?: AshbyCompensationComponent[] | null;
  [key: string]: unknown;
}

export interface AshbyCompensationSummaryComponent {
  compensationType?: string | null;
  interval?: string | null;
  currencyCode?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  [key: string]: unknown;
}

export interface AshbyCompensation {
  compensationTierSummary?: string | null;
  scrapeableCompensationSalarySummary?: string | null;
  compensationTiers?: AshbyCompensationTier[] | null;
  summaryComponents?: AshbyCompensationSummaryComponent[] | null;
  [key: string]: unknown;
}

/**
 * Public Job Postings API job object
 * (`api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true`).
 */
export interface AshbyJob {
  id?: string;
  title?: string;
  department?: string | null;
  team?: string | null;
  employmentType?: string | null;
  location?: string | null;
  secondaryLocations?: AshbySecondaryLocation[] | null;
  publishedAt?: string | null;
  isListed?: boolean | null;
  isRemote?: boolean | null;
  workplaceType?: string | null;
  address?: AshbyAddress | null;
  jobUrl?: string | null;
  applyUrl?: string | null;
  descriptionHtml?: string | null;
  descriptionPlain?: string | null;
  compensation?: AshbyCompensation | null;
  shouldDisplayCompensationOnJobPostings?: boolean | null;
  [key: string]: unknown;
}

export interface AshbyJobsResponse {
  apiVersion?: string;
  jobs?: AshbyJob[];
  [key: string]: unknown;
}

export interface AshbyRawJobPayload extends AshbyJob {
  sourcePlatform?: "ashby";
}
