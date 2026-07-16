"use client";

import Link from "next/link";
import type { AnalyticsWindowDays } from "@/lib/api/types";

const OPTIONS: Array<{ days: AnalyticsWindowDays; label: string }> = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

export function WindowSelector({
  windowDays,
}: {
  windowDays: AnalyticsWindowDays;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-0.5"
      role="group"
      aria-label="Analytics time window"
    >
      {OPTIONS.map((option) => {
        const active = option.days === windowDays;

        return (
          <Link
            key={option.days}
            href={`/dashboard?windowDays=${option.days}`}
            className={
              active
                ? "rounded-lg bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                : "rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
            }
            aria-current={active ? "true" : undefined}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
