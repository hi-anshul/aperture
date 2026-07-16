"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

export function JobsPagination({
  page,
  totalPages,
  total,
  pageSize,
  isLoading = false,
  onPageChange,
}: JobsPaginationProps) {
  if (total === 0 || totalPages <= 1) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3">
      <p className="text-xs text-[var(--text-muted)]">
        Showing{" "}
        <span className="tabular-nums text-[var(--text-secondary)]">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="tabular-nums text-[var(--text-secondary)]">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="h-8 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span
          className={cn(
            "min-w-[4.5rem] text-center text-xs tabular-nums text-[var(--text-secondary)]",
          )}
        >
          {page} / {totalPages}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="h-8 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
