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
  summaryComponents?: AshbyCompensationSummaryComponent[] | null;
  [key: string]: unknown;
}

export interface AshbyRawJobPayload {
  id?: string;
  title?: string;
  department?: string | null;
  team?: string | null;
  employmentType?: string | null;
  location?: string | null;
  secondaryLocations?: Array<{ location?: string | null }> | null;
  publishedAt?: string | null;
  isRemote?: boolean | null;
  workplaceType?: string | null;
  address?: AshbyAddress | null;
  jobUrl?: string | null;
  applyUrl?: string | null;
  descriptionHtml?: string | null;
  descriptionPlain?: string | null;
  compensation?: AshbyCompensation | null;
  [key: string]: unknown;
}
