export default function CompaniesPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Companies
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Tracked companies with platform badges and sync status will be built in
          Phase 15.
        </p>
      </div>
    </main>
  );
}
