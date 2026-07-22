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

export interface LeverPosting {
  id?: string;
  text?: string;
  categories?: LeverCategories | null;
  country?: string | null;
  description?: string | null;
  descriptionPlain?: string | null;
  lists?: LeverListItem[] | null;
  additional?: string | null;
  additionalPlain?: string | null;
  hostedUrl?: string | null;
  applyUrl?: string | null;
  workplaceType?: string | null;
  salaryRange?: LeverSalaryRange | null;
  createdAt?: number | string | null;
  [key: string]: unknown;
}

export type LeverPostingsResponse = LeverPosting[];
