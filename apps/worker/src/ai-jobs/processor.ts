import {
  formatResumeSummary,
  matchJobToResume,
  type MatchJobOptions,
} from "@aperture/ai";
import type { MatchResult } from "@aperture/shared";

import {
  enqueueHighMatchNotification,
  type HighMatchNotifyStore,
  type NotifyQueue,
} from "../notifications";
import type { MatchJobQueueData } from "./constants";

export interface MatchJobRecord {
  id: string;
  title: string;
  description: string;
  location: string | null;
  tags: string[];
  isActive: boolean;
}

export interface MatchResumeRecord {
  id: string;
  userId: string;
  skills: string[];
  experience: unknown;
  education: unknown;
  keywords: string[];
}

export interface MatchJobStore {
  job: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        title: true;
        description: true;
        location: true;
        tags: true;
        isActive: true;
      };
    }): Promise<MatchJobRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        matchScore: number;
        matchVerdict: string;
        matchMissingSkills: string[];
        matchExplanation: string;
        matchedResumeId: string;
        matchedAt: Date;
      };
    }): Promise<unknown>;
  };
  resume: {
    findFirst(args: {
      where: { userId?: string };
      orderBy: { uploadedAt: "desc" };
    }): Promise<MatchResumeRecord | null>;
    findUnique(args: {
      where: { id: string };
    }): Promise<MatchResumeRecord | null>;
  };
  user: {
    findFirst(args: {
      orderBy: { createdAt: "asc" };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
}

export interface ProcessMatchJobDeps {
  notifyQueue?: NotifyQueue;
  notifyStore?: HighMatchNotifyStore;
}

export interface ProcessMatchJobResult {
  jobId: string;
  resumeId: string;
  score: number;
  verdict: string;
  skipped?: "no-resume" | "job-inactive" | "job-missing";
  highMatchNotified?: boolean;
}

async function resolveResume(
  store: MatchJobStore,
  data: MatchJobQueueData,
): Promise<MatchResumeRecord | null> {
  if (data.resumeId) {
    return store.resume.findUnique({ where: { id: data.resumeId } });
  }

  if (data.userId) {
    return store.resume.findFirst({
      where: { userId: data.userId },
      orderBy: { uploadedAt: "desc" },
    });
  }

  // MVP single-user: use the oldest user (seeded account) as the default owner.
  const user = await store.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  return store.resume.findFirst({
    where: { userId: user.id },
    orderBy: { uploadedAt: "desc" },
  });
}

/**
 * Loads job + active resume, scores via Claude, validates, then persists.
 * Invalid AI output throws before any DB write — existing match fields stay intact.
 * After a successful score, may enqueue a high-match notification (Phase 18).
 */
export async function processMatchJob(
  data: MatchJobQueueData,
  store: MatchJobStore,
  matchOptions: MatchJobOptions = {},
  deps: ProcessMatchJobDeps = {},
): Promise<ProcessMatchJobResult> {
  const job = await store.job.findUnique({
    where: { id: data.jobId },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      tags: true,
      isActive: true,
    },
  });

  if (!job) {
    return {
      jobId: data.jobId,
      resumeId: "",
      score: 0,
      verdict: "",
      skipped: "job-missing",
    };
  }

  if (!job.isActive) {
    return {
      jobId: job.id,
      resumeId: "",
      score: 0,
      verdict: "",
      skipped: "job-inactive",
    };
  }

  const resume = await resolveResume(store, data);
  if (!resume) {
    return {
      jobId: job.id,
      resumeId: "",
      score: 0,
      verdict: "",
      skipped: "no-resume",
    };
  }

  const resumeSummary = formatResumeSummary({
    skills: resume.skills,
    keywords: resume.keywords,
    experience: resume.experience,
    education: resume.education,
  });

  if (!resumeSummary.trim()) {
    return {
      jobId: job.id,
      resumeId: resume.id,
      score: 0,
      verdict: "",
      skipped: "no-resume",
    };
  }

  const match: MatchResult = await matchJobToResume(
    {
      jobId: job.id,
      resumeId: resume.id,
      jobTitle: job.title,
      jobDescription: job.description,
      jobLocation: job.location,
      jobTags: job.tags,
      resumeSummary,
    },
    matchOptions,
  );

  await store.job.update({
    where: { id: job.id },
    data: {
      matchScore: match.score,
      matchVerdict: match.verdict,
      matchMissingSkills: match.missingSkills,
      matchExplanation: match.explanation,
      matchedResumeId: match.resumeId,
      matchedAt: new Date(),
    },
  });

  let highMatchNotified = false;

  if (deps.notifyQueue && deps.notifyStore) {
    try {
      highMatchNotified = await enqueueHighMatchNotification(
        deps.notifyQueue,
        {
          jobId: job.id,
          userId: resume.userId,
          score: match.score,
        },
        deps.notifyStore,
      );
    } catch (error) {
      // Match already persisted — log and continue; notification can be retried later.
      console.error(
        `[ai-match] Failed to enqueue high-match notification for ${job.id}:`,
        error,
      );
    }
  }

  return {
    jobId: job.id,
    resumeId: resume.id,
    score: match.score,
    verdict: match.verdict,
    highMatchNotified,
  };
}
