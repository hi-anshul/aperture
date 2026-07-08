export function FilterSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-elevated)] lg:flex">
      <div className="border-b border-[var(--border-default)] px-4 py-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Filters
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Filter controls arrive in Phase 14.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-xs text-[var(--text-secondary)]">
          Work mode, country, salary, and platform filters will appear here.
        </p>
      </div>
    </aside>
  );
}
