import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { prisma } from "@aperture/db";
import type { ListJobsQuery } from "./dto/list-jobs-query.dto";
import { enqueueJobRescore } from "./match-queue";
import { buildJobWhereClause } from "./query/build-job-query";
import {
  JOB_SEARCH_PROVIDER,
  type JobSearchProvider,
} from "./search/job-search.provider";

export interface JobMatchFields {
  matchScore: number | null;
  matchVerdict: "good-match" | "weak-match" | null;
  matchMissingSkills: string[];
  matchExplanation: string | null;
  matchedResumeId: string | null;
  matchedAt: string | null;
}

function mapMatchFields(job: {
  matchScore: number | null;
  matchVerdict: string | null;
  matchMissingSkills: string[];
  matchExplanation: string | null;
  matchedResumeId: string | null;
  matchedAt: Date | null;
}): JobMatchFields {
  const verdict =
    job.matchVerdict === "good-match" || job.matchVerdict === "weak-match"
      ? job.matchVerdict
      : null;

  return {
    matchScore: job.matchScore,
    matchVerdict: verdict,
    matchMissingSkills: job.matchMissingSkills,
    matchExplanation: job.matchExplanation,
    matchedResumeId: job.matchedResumeId,
    matchedAt: job.matchedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class JobsService {
  constructor(
    @Inject(JOB_SEARCH_PROVIDER)
    private readonly searchProvider: JobSearchProvider,
  ) {}

  async listJobs(userId: string, query: ListJobsQuery) {
    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    const { q, ...filters } = query;
    const searchConstraint = q
      ? await this.searchProvider.buildSearchConstraint(q)
      : undefined;
    const where = await buildJobWhereClause({ filters, searchConstraint });

    const [jobs, watchlistedCompanyIds] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
        orderBy: [{ postedAt: "desc" }, { firstSeenAt: "desc" }],
      }),
      prisma.watchlist.findMany({
        where: { userId },
        select: { companyId: true },
      }),
    ]);

    const watchlistedIds = new Set(
      watchlistedCompanyIds.map((entry) => entry.companyId),
    );

    return {
      jobs: jobs.map((job) => ({
        id: job.id,
        externalId: job.externalId,
        title: job.title,
        location: job.location,
        workMode: job.workMode,
        country: job.country,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        visaSponsorship: job.visaSponsorship,
        tags: job.tags,
        sourceUrl: job.sourceUrl,
        sourcePlatform: job.sourcePlatform,
        postedAt: job.postedAt?.toISOString() ?? null,
        firstSeenAt: job.firstSeenAt.toISOString(),
        lastSeenAt: job.lastSeenAt.toISOString(),
        isFromWatchlistedCompany: watchlistedIds.has(job.companyId),
        company: job.company,
        ...mapMatchFields(job),
      })),
      total: jobs.length,
    };
  }

  async getJob(userId: string, jobId: string) {
    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    const watchlisted = await prisma.watchlist.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: job.companyId,
        },
      },
      select: { id: true },
    });

    return {
      id: job.id,
      externalId: job.externalId,
      title: job.title,
      description: job.description,
      location: job.location,
      workMode: job.workMode,
      country: job.country,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      visaSponsorship: job.visaSponsorship,
      tags: job.tags,
      sourceUrl: job.sourceUrl,
      sourcePlatform: job.sourcePlatform,
      postedAt: job.postedAt?.toISOString() ?? null,
      firstSeenAt: job.firstSeenAt.toISOString(),
      lastSeenAt: job.lastSeenAt.toISOString(),
      isActive: job.isActive,
      isFromWatchlistedCompany: watchlisted != null,
      company: job.company,
      ...mapMatchFields(job),
      // Phase 21 will populate structured AI summary fields.
      aiSummary: null as null,
    };
  }

  /**
   * Enqueues an async AI re-score. Never calls Claude from the request path.
   */
  async rescoreJob(userId: string, jobId: string) {
    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, isActive: true },
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    if (!job.isActive) {
      throw new BadRequestException("Cannot re-score an inactive job");
    }

    const resume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
      select: { id: true },
    });

    if (!resume) {
      throw new BadRequestException(
        "Upload a resume before requesting a match score",
      );
    }

    try {
      await enqueueJobRescore({
        jobId: job.id,
        resumeId: resume.id,
        userId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to enqueue re-score";
      if (message.includes("REDIS_URL")) {
        throw new ServiceUnavailableException(message);
      }
      throw error;
    }

    return {
      jobId: job.id,
      status: "queued" as const,
      resumeId: resume.id,
    };
  }
}
