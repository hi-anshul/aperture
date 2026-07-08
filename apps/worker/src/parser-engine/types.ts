import type { PlatformType, RawJob } from "@aperture/shared";

export interface ParseRequest {
  platform: PlatformType;
  content: string;
  sourceUrl?: string;
  companyId?: string;
}

export interface ParseSuccess {
  platform: PlatformType;
  jobs: RawJob[];
}
