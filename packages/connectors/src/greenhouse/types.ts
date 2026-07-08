export interface GreenhouseJobLocation {
  name: string;
}

export interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: GreenhouseJobLocation;
  updated_at: string;
  [key: string]: unknown;
}

export interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}
