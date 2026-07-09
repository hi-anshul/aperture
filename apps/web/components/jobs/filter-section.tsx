"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FilterSectionProps {
  title: string;
  activeCount: number;
  onClear: () => void;
  children: React.ReactNode;
}

export function FilterSection({
  title,
  activeCount,
  onClear,
  children,
}: FilterSectionProps) {
  return (
    <section className="border-b border-[var(--border-default)] px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-xs font-medium text-[var(--text-secondary)]">
            {title}
          </h3>
          {activeCount > 0 ? (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 rounded-full bg-[var(--accent-primary)] px-1.5 text-[10px] font-semibold text-white tabular-nums"
            >
              {activeCount}
            </Badge>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Clear ${title} filter`}
            onClick={onClear}
            className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
