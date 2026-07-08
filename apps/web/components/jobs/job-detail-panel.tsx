"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "@/components/jobs/match-score-badge";
import type { JobListItem } from "@/lib/api/types";
import { formatPostedDate, formatSalary } from "@/lib/format";

interface JobDetailPanelProps {
  job: JobListItem | null;
  onClose: () => void;
}

export function JobDetailPanel({ job, onClose }: JobDetailPanelProps) {
  const salary = job
    ? formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)
    : null;

  return (
    <AnimatePresence>
      {job ? (
        <motion.aside
          key="job-detail-panel"
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex w-full max-w-md shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--bg-elevated)] lg:max-w-lg"
          aria-label={`Job details: ${job.title}`}
        >
          <motion.div
            key={job.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex min-h-0 flex-1 flex-col"
          >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {job.company.name}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                {job.title}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close job details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-default)] px-5 py-3">
            <MatchScoreBadge />
            <span className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              Interested
            </span>
            <span className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
              Save and status controls in Phase 19
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  AI summary
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Structured role summary arrives in Phase 21. For now, review
                  metadata and apply directly from the source posting.
                </p>
              </section>

              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">Location</dt>
                  <dd className="mt-0.5 text-[var(--text-primary)]">
                    {job.location ?? "Not specified"}
                  </dd>
                </div>
                {job.workMode ? (
                  <div>
                    <dt className="text-xs text-[var(--text-muted)]">
                      Work mode
                    </dt>
                    <dd className="mt-0.5 capitalize text-[var(--text-primary)]">
                      {job.workMode}
                    </dd>
                  </div>
                ) : null}
                {job.employmentType ? (
                  <div>
                    <dt className="text-xs text-[var(--text-muted)]">
                      Employment type
                    </dt>
                    <dd className="mt-0.5 capitalize text-[var(--text-primary)]">
                      {job.employmentType}
                    </dd>
                  </div>
                ) : null}
                {salary ? (
                  <div>
                    <dt className="text-xs text-[var(--text-muted)]">Salary</dt>
                    <dd className="mt-0.5 tabular-nums text-[var(--text-primary)]">
                      {salary}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">Posted</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--text-primary)]">
                    {formatPostedDate(job.postedAt ?? job.firstSeenAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">Platform</dt>
                  <dd className="mt-0.5 capitalize text-[var(--text-primary)]">
                    {job.sourcePlatform}
                  </dd>
                </div>
              </dl>

              {job.tags.length > 0 ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Tags
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-xl bg-[var(--bg-surface)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[var(--border-default)] px-5 py-4">
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-2xl bg-[var(--accent-primary)] px-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:opacity-90"
            >
              Apply on company site
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          </motion.div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
