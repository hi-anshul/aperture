export function MatchScoreBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--match-none)]"
      aria-label="Match score: not scored"
    >
      Not scored
    </span>
  );
}
