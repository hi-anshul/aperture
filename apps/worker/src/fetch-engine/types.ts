export type FetchMode = "http" | "browser";

export interface FetchRequest {
  url: string;
  companyId: string;
  mode?: FetchMode;
  /** Override default UA only when a site's policy requires rotation */
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface FetchSuccess {
  ok: true;
  url: string;
  status: number;
  contentType: string;
  /** Raw response body — never parsed in this module */
  body: string;
  fetchedAt: Date;
  mode: FetchMode;
}
