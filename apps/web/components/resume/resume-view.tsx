"use client";

import { useState } from "react";
import { ResumeReview } from "@/components/resume/resume-review";
import { ResumeUploadForm } from "@/components/resume/resume-upload-form";
import type { ResumeResponse } from "@/lib/api/types";

interface ResumeViewProps {
  initialResume: ResumeResponse | null;
}

export function ResumeView({ initialResume }: ResumeViewProps) {
  const [resume, setResume] = useState<ResumeResponse | null>(initialResume);

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Resume
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Upload a PDF so Aperture can extract skills and keywords for AI
          matching. Review the parsed data before trusting it.
        </p>
      </div>

      <ResumeUploadForm
        hasActiveResume={resume !== null}
        onUploaded={setResume}
      />

      {resume ? (
        <ResumeReview resume={resume} />
      ) : (
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-8">
          <p className="text-sm text-[var(--text-secondary)]">
            No active resume yet. Upload a PDF above to extract skills,
            experience, education, and keywords.
          </p>
        </section>
      )}
    </main>
  );
}
