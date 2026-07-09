import { Badge } from "@/components/ui/badge";
import type { ResumeResponse } from "@/lib/api/types";

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) {
    return "Dates not specified";
  }
  return `${start ?? "?"} – ${end ?? "Present"}`;
}

function formatUploadedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ResumeReviewProps {
  resume: ResumeResponse;
}

export function ResumeReview({ resume }: ResumeReviewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4">
        <p className="text-xs text-[var(--text-muted)]">
          Active resume · uploaded {formatUploadedAt(resume.uploadedAt)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Review the extracted data below. Re-upload a PDF to replace it —
          matching (Phase 17) will use this active resume.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Skills
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {resume.skills.length} extracted
          </p>
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {resume.skills.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              No skills extracted.
            </p>
          ) : (
            resume.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
              >
                {skill}
              </Badge>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Keywords
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {resume.keywords.length} extracted
          </p>
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {resume.keywords.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              No keywords extracted.
            </p>
          ) : (
            resume.keywords.map((keyword) => (
              <Badge
                key={keyword}
                variant="outline"
                className="rounded-xl border-[var(--border-default)] text-[var(--text-secondary)]"
              >
                {keyword}
              </Badge>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Experience
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {resume.experience.length} role
            {resume.experience.length === 1 ? "" : "s"}
          </p>
        </div>
        {resume.experience.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--text-secondary)]">
            No experience entries extracted.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {resume.experience.map((entry, index) => (
              <div key={`${entry.company}-${entry.title}-${index}`} className="px-5 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {entry.title}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {entry.company}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDateRange(entry.startDate, entry.endDate)}
                  </p>
                </div>
                {entry.highlights.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                    {entry.highlights.map((highlight, highlightIndex) => (
                      <li key={`${highlight}-${highlightIndex}`}>{highlight}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Education
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {resume.education.length} entr
            {resume.education.length === 1 ? "y" : "ies"}
          </p>
        </div>
        {resume.education.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--text-secondary)]">
            No education entries extracted.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {resume.education.map((entry, index) => (
              <div
                key={`${entry.institution}-${index}`}
                className="px-5 py-4"
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {entry.institution}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {[entry.degree, entry.field].filter(Boolean).join(" · ") ||
                    "Degree not specified"}
                </p>
                {entry.graduationYear ? (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {entry.graduationYear}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
