"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Aperture } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation";

export function AppNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--bg-base)]/90 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[var(--text-primary)] transition hover:text-[var(--accent-primary)]"
        >
          <Aperture className="h-5 w-5" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">Aperture</span>
        </Link>
        <span className="text-xs text-[var(--text-muted)]">
          Job-search intelligence
        </span>
      </div>
    </header>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-elevated)] md:flex md:flex-col">
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
