"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientUploadResume } from "@/lib/api/resumes-client";
import type { ResumeResponse } from "@/lib/api/types";

interface ResumeUploadFormProps {
  hasActiveResume: boolean;
  onUploaded: (resume: ResumeResponse) => void;
}

export function ResumeUploadForm({
  hasActiveResume,
  onUploaded,
}: ResumeUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a PDF resume to upload.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resume = await clientUploadResume(selectedFile);
      onUploaded(resume);
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload this resume. Try a text-based PDF and confirm ANTHROPIC_API_KEY is set.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {hasActiveResume ? "Replace resume" : "Upload resume"}
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Upload a single PDF. Skills, experience, education, and keywords are
          extracted for review. A new upload replaces the active resume.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-secondary)] transition hover:border-[var(--focus-ring)] hover:bg-[var(--bg-hover)]">
          <Upload className="size-4 shrink-0 text-[var(--text-muted)]" />
          <span className="truncate">
            {selectedFile ? selectedFile.name : "Choose a PDF file…"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={isSubmitting}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
              setError(null);
            }}
          />
        </label>
        <Button
          type="submit"
          disabled={isSubmitting || !selectedFile}
          className="h-10 rounded-2xl bg-[var(--accent-primary)] px-4 text-[var(--text-primary)] hover:bg-[color-mix(in_oklch,var(--accent-primary),white_10%)]"
        >
          {isSubmitting
            ? "Extracting…"
            : hasActiveResume
              ? "Replace & extract"
              : "Upload & extract"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-[var(--state-error)]">{error}</p>
      ) : null}
    </form>
  );
}
