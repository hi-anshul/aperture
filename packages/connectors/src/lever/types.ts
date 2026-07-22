export type LeverApiRegion = "global" | "eu";

export interface LeverSite {
  /** Lever site slug, e.g. "acme" */
  site: string;
  region: LeverApiRegion;
}

export interface LeverCategories {
  location?: string | null;
  commitment?: string | null;
  team?: string | null;
  department?: string | null;
  allLocations?: string[] | null;
  [key: string]: unknown;
}

export interface LeverSalaryRange {
  currency?: string | null;
  interval?: string | null;
  min?: number | null;
  max?: number | null;
  [key: string]: unknown;
}

export interface LeverListItem {
  text?: string | null;
  content?: string | null;
  [key: string]: unknown;
}

/**
 * Public Postings API posting object (`api.lever.co/v0/postings/{site}?mode=json`).
 * Response is a JSON array of these objects.
 */
export interface LeverPosting {
  id?: string;
  text?: string;
  categories?: LeverCategories | null;
  country?: string | null;
  opening?: string | null;
  openingPlain?: string | null;
  description?: string | null;
  descriptionPlain?: string | null;
  descriptionBody?: string | null;
  descriptionBodyPlain?: string | null;
  lists?: LeverListItem[] | null;
  additional?: string | null;
  additionalPlain?: string | null;
  hostedUrl?: string | null;
  applyUrl?: string | null;
  workplaceType?: string | null;
  salaryRange?: LeverSalaryRange | null;
  salaryDescription?: string | null;
  salaryDescriptionPlain?: string | null;
  createdAt?: number | string | null;
  [key: string]: unknown;
}

export type LeverPostingsResponse = LeverPosting[];

export interface LeverRawJobPayload extends LeverPosting {
  sourcePlatform?: "lever";
}
