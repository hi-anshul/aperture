import type { MatchVerdict } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface MatchScoreBadgeProps {
  score?: number | null;
  verdict?: MatchVerdict | null;
  className?: string;
}

function resolveTone(
  score: number | null | undefined,
  verdict: MatchVerdict | null | undefined,
): {
  label: string;
  className: string;
  aria: string;
} {
  if (score == null) {
    return {
      label: "Not scored",
      className: "text-[var(--match-none)]",
      aria: "Match score: not scored",
    };
  }

  const isGood = verdict === "good-match" || (verdict == null && score >= 60);
  const className = isGood
    ? "text-[var(--match-good)]"
    : "text-[var(--match-weak)]";
  const label = `${score}`;

  return {
    label,
    className,
    aria: `Match score: ${score}${verdict ? `, ${verdict}` : ""}`,
  };
}

export function MatchScoreBadge({
  score = null,
  verdict = null,
  className,
}: MatchScoreBadgeProps) {
  const tone = resolveTone(score, verdict);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[0.65rem] font-medium tabular-nums",
        tone.className,
        className,
      )}
      aria-label={tone.aria}
    >
      {tone.label}
    </span>
  );
}
