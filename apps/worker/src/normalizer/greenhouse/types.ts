/** Greenhouse Job Board API shape — read only inside the normalizer. */

export interface GreenhouseJobLocation {
  name?: string;
}

export interface GreenhouseDepartment {
  id?: number;
  name?: string;
}

export interface GreenhouseOffice {
  id?: number;
  name?: string;
  location?: string;
}

export interface GreenhouseMetadataField {
  id?: number;
  name?: string;
  value?: string | null;
  value_type?: string;
}

export interface GreenhouseRawJob {
  id?: number | string;
  title?: string;
  absolute_url?: string;
  content?: string;
  location?: GreenhouseJobLocation;
  updated_at?: string;
  first_published?: string;
  departments?: GreenhouseDepartment[];
  offices?: GreenhouseOffice[];
  metadata?: GreenhouseMetadataField[] | null;
  [key: string]: unknown;
}
