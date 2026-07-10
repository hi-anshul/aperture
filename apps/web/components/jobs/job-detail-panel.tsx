"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, ExternalLink, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "@/components/jobs/match-score-badge";
import {
  clientFetchJob,
  clientRescoreJob,
} from "@/lib/api/jobs-client";
import {
  clientSaveJob,
  clientUpdateSavedJobStatus,
} from "@/lib/api/saved-jobs-client";
import type { JobListItem, SavedJobStatus } from "@/lib/api/types";
import { formatPostedDate, formatSalary } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: SavedJobStatus; label: string }> = [
  { value: "interested", label: "Interested" },
  { value: "applied", label: "Applied" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_TEXT: Record<SavedJobStatus, string> = {
  interested: "text-[var(--accent-primary)]",
  applied: "text-[var(--state-success)]",
  rejected: "text-[var(--state-error)]",
};

interface JobDetailPanelProps {
  job: JobListItem | null;
  onClose: () => void;
  onMatchUpdated?: (job: JobListItem) => void;
  onSavedUpdated?: (job: JobListItem) => void;
}

export function JobDetailPanel({
  job,
  onClose,
  onMatchUpdated,
  onSavedUpdated,
}: JobDetailPanelProps) {
  const [isRescoring, setIsRescoring] = useState(false);
  const [rescoreMessage, setRescoreMessage] = useState<string | null>(null);
  const [rescoreError, setRescoreError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const activeJobIdRef = useRef<string | null>(job?.id ?? null);

  useEffect(() => {
    activeJobIdRef.current = job?.id ?? null;
    setIsRescoring(false);
    setRescoreMessage(null);
    setRescoreError(null);
    setIsSaving(false);
    setIsUpdatingStatus(false);
    setSaveError(null);
  }, [job?.id]);

  const salary = job
    ? formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)
    : null;

  async function handleRescore() {
    if (!job || isRescoring) {
      return;
    }

    const jobId = job.id;
    const jobSnapshot = job;
    const isActiveJob = () => activeJobIdRef.current === jobId;

    setIsRescoring(true);
    setRescoreError(null);
    setRescoreMessage(null);

    try {
      await clientRescoreJob(jobId);
      if (!isActiveJob()) {
        return;
      }
      setRescoreMessage("Re-score queued — refreshing shortly…");

      // Poll briefly for the worker to persist the new score.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (!isActiveJob()) {
          return;
        }
        const detail = await clientFetchJob(jobId);
        if (!isActiveJob()) {
          return;
        }
        if (
          detail.matchedAt &&
          detail.matchedAt !== jobSnapshot.matchedAt
        ) {
          onMatchUpdated?.({
            ...jobSnapshot,
            matchScore: detail.matchScore,
            matchVerdict: detail.matchVerdict,
            matchMissingSkills: detail.matchMissingSkills,
            matchExplanation: detail.matchExplanation,
            matchedResumeId: detail.matchedResumeId,
            matchedAt: detail.matchedAt,
          });
          setRescoreMessage("Match score updated.");
          return;
        }
      }

      if (!isActiveJob()) {
        return;
      }
      setRescoreMessage(
        "Re-score is still running — refresh the list in a moment.",
      );
    } catch (error) {
      if (!isActiveJob()) {
        return;
      }
      setRescoreError(
        error instanceof Error ? error.message : "Failed to queue re-score",
      );
    } finally {
      if (isActiveJob()) {
        setIsRescoring(false);
      }
    }
  }

  async function handleSave() {
    if (!job || job.savedJob || isSaving) {
      return;
    }

    const jobId = job.id;
    const jobSnapshot = job;
    const isActiveJob = () => activeJobIdRef.current === jobId;

    setIsSaving(true);
    setSaveError(null);

    try {
      const saved = await clientSaveJob(jobId, "interested");
      if (!isActiveJob()) {
        return;
      }
      onSavedUpdated?.({
        ...jobSnapshot,
        savedJob: { id: saved.id, status: saved.status },
      });
    } catch (error) {
      if (!isActiveJob()) {
        return;
      }
      setSaveError(
        error instanceof Error ? error.message : "Failed to save job",
      );
    } finally {
      if (isActiveJob()) {
        setIsSaving(false);
      }
    }
  }

  async function handleStatusChange(status: SavedJobStatus) {
    if (!job?.savedJob || isUpdatingStatus || job.savedJob.status === status) {
      return;
    }

    const jobId = job.id;
    const jobSnapshot = job;
    const previousStatus = job.savedJob.status;
    const isActiveJob = () => activeJobIdRef.current === jobId;

    // Optimistic UI — reconcile with API response.
    onSavedUpdated?.({
      ...jobSnapshot,
      savedJob: { id: job.savedJob.id, status },
    });
    setIsUpdatingStatus(true);
    setSaveError(null);

    try {
      const updated = await clientUpdateSavedJobStatus(job.savedJob.id, status);
      if (!isActiveJob()) {
        return;
      }
      onSavedUpdated?.({
        ...jobSnapshot,
        savedJob: { id: updated.id, status: updated.status },
      });
    } catch (error) {
      if (!isActiveJob()) {
        return;
      }
      onSavedUpdated?.({
        ...jobSnapshot,
        savedJob: { id: jobSnapshot.savedJob!.id, status: previousStatus },
      });
      setSaveError(
        error instanceof Error ? error.message : "Failed to update status",
      );
    } finally {
      if (isActiveJob()) {
        setIsUpdatingStatus(false);
      }
    }
  }

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

          <div className="flex flex-col gap-3 border-b border-[var(--border-default)] px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <MatchScoreBadge
                score={job.matchScore}
                verdict={job.matchVerdict}
              />
              {job.matchVerdict ? (
                <span
                  className={
                    job.matchVerdict === "good-match"
                      ? "rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs text-[var(--match-good)]"
                      : "rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs text-[var(--match-weak)]"
                  }
                >
                  {job.matchVerdict === "good-match" ? "Good match" : "Weak match"}
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleRescore();
                }}
                disabled={isRescoring}
                className="ml-auto gap-1.5"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRescoring ? "animate-spin" : ""}`}
                />
                {isRescoring ? "Scoring…" : "Re-score"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {job.savedJob ? (
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Saved job status"
                >
                  {STATUS_OPTIONS.map((option) => {
                    const isActive = job.savedJob?.status === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => {
                          void handleStatusChange(option.value);
                        }}
                        className={cn(
                          "rounded-xl border px-2.5 py-1 text-xs transition",
                          isActive
                            ? cn(
                                "border-[var(--border-default)] bg-[var(--bg-surface)] font-medium",
                                STATUS_TEXT[option.value],
                              )
                            : "border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)]",
                          isUpdatingStatus && "opacity-60",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              )}
            </div>

            {saveError ? (
              <p className="text-xs text-[var(--state-error)]">{saveError}</p>
            ) : null}
          </div>

          {(rescoreMessage || rescoreError) && (
            <div className="border-b border-[var(--border-default)] px-5 py-2">
              {rescoreError ? (
                <p className="text-xs text-[var(--state-error)]">{rescoreError}</p>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">{rescoreMessage}</p>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Match analysis
                </h3>
                {job.matchExplanation ? (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {job.matchExplanation}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    No match score yet. New postings are scored automatically
                    after sync, or use Re-score once a resume is uploaded.
                  </p>
                )}
                {job.matchMissingSkills.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      Missing skills
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {job.matchMissingSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-xl bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

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
