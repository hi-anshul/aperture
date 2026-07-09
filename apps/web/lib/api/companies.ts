import type { CompaniesListResponse } from "./types";
import { serverFetch } from "./server";

export async function fetchCompanies(): Promise<CompaniesListResponse> {
  return serverFetch<CompaniesListResponse>("/companies");
}
