"use client";

import { useState } from "react";
import { AddCompanyForm } from "@/components/companies/add-company-form";
import { CompanyRow } from "@/components/companies/company-row";
import type { CompanyListItem } from "@/lib/api/types";

interface CompaniesViewProps {
  initialCompanies: CompanyListItem[];
}

export function CompaniesView({ initialCompanies }: CompaniesViewProps) {
  const [companies, setCompanies] = useState(initialCompanies);

  function handleCompanyAdded(company: CompanyListItem) {
    setCompanies((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== company.id);
      return [company, ...withoutDuplicate].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    });
  }

  function handleWatchlistChange(
    companyId: string,
    watchlist: CompanyListItem["watchlist"],
  ) {
    setCompanies((current) =>
      current.map((company) =>
        company.id === companyId ? { ...company, watchlist } : company,
      ),
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Companies
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Track careers pages, detect their platform, and star companies for
          priority notifications.
        </p>
      </div>

      <AddCompanyForm onCompanyAdded={handleCompanyAdded} />

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Tracked companies
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {companies.length} compan{companies.length === 1 ? "y" : "ies"}{" "}
            in your tracking list
          </p>
        </div>

        {companies.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--text-secondary)]">
            No companies yet. Paste a careers URL above to start tracking.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {companies.map((company) => (
              <CompanyRow
                key={company.id}
                company={company}
                onWatchlistChange={handleWatchlistChange}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
