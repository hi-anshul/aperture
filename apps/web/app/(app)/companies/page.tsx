import { CompaniesView } from "@/components/companies/companies-view";
import { fetchCompanies } from "@/lib/api/companies";

export default async function CompaniesPage() {
  try {
    const { companies } = await fetchCompanies();

    return <CompaniesView initialCompanies={companies} />;
  } catch {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Unable to load companies
        </p>
        <p className="max-w-md text-sm text-[var(--text-muted)]">
          The companies list could not be fetched. Check that the API is running
          and try refreshing the page.
        </p>
      </main>
    );
  }
}
