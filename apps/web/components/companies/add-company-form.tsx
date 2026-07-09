"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clientCreateCompany } from "@/lib/api/companies-client";
import type { CompanyListItem } from "@/lib/api/types";

interface AddCompanyFormProps {
  onCompanyAdded: (company: CompanyListItem) => void;
}

export function AddCompanyForm({ onCompanyAdded }: AddCompanyFormProps) {
  const [careersUrl, setCareersUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = careersUrl.trim();

    if (!trimmedUrl) {
      setError("Paste a careers page URL to add a company.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const company = await clientCreateCompany(trimmedUrl);
      onCompanyAdded(company);
      setCareersUrl("");
    } catch {
      setError(
        "Could not add this company. Check the URL and try again, or confirm it is not already tracked.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Add company
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Paste a careers page URL. Platform detection runs automatically.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={careersUrl}
          onChange={(event) => setCareersUrl(event.target.value)}
          placeholder="https://boards.greenhouse.io/example"
          className="h-10 min-w-0 flex-1 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/30"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 rounded-2xl bg-[var(--accent-primary)] px-4 text-[var(--text-primary)] hover:bg-[color-mix(in_oklch,var(--accent-primary),white_10%)]"
        >
          {isSubmitting ? "Adding…" : "Add company"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-[var(--state-error)]">{error}</p>
      ) : null}
    </form>
  );
}
