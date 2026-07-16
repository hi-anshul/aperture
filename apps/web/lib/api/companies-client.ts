import type { CompaniesListResponse, CompanyListItem } from "./types";

export interface CompanySyncResponse {
  companyId: string;
  status: "queued";
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function clientFetchCompanies(): Promise<CompaniesListResponse> {
  const response = await fetch("/api/companies", { cache: "no-store" });
  return parseJsonResponse<CompaniesListResponse>(response);
}

export async function clientCreateCompany(
  careersUrl: string,
): Promise<CompanyListItem> {
  const response = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ careersUrl }),
  });

  return parseJsonResponse<CompanyListItem>(response);
}

export async function clientSyncCompany(
  companyId: string,
): Promise<CompanySyncResponse> {
  const response = await fetch(`/api/companies/${companyId}/sync`, {
    method: "POST",
  });

  return parseJsonResponse<CompanySyncResponse>(response);
}

export async function clientDeleteCompany(companyId: string): Promise<void> {
  const response = await fetch(`/api/companies/${companyId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }
}
