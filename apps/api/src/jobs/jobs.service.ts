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

function mapSavedJobStatus(
  status: string,
): "interested" | "applied" | "rejected" {
  if (status === "applied" || status === "rejected" || status === "interested") {
    return status;
  }
  return "interested";
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

    const { q, page, limit, ...filters } = query;
    const searchConstraint = q
      ? await this.searchProvider.buildSearchConstraint(q)
      : undefined;
    const where = await buildJobWhereClause({ filters, searchConstraint });
    const skip = (page - 1) * limit;

    const [jobs, total, watchlistedCompanyIds, savedJobs] = await Promise.all([
      prisma.job.findMany({
        where,
        select: {
          id: true,
          externalId: true,
          title: true,
          location: true,
          workMode: true,
          country: true,
          employmentType: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          visaSponsorship: true,
          tags: true,
          sourceUrl: true,
          sourcePlatform: true,
          postedAt: true,
          firstSeenAt: true,
          lastSeenAt: true,
          companyId: true,
          matchScore: true,
          matchVerdict: true,
          matchMissingSkills: true,
          matchExplanation: true,
          matchedResumeId: true,
          matchedAt: true,
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
        orderBy: [{ postedAt: "desc" }, { firstSeenAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
      prisma.watchlist.findMany({
        where: { userId },
        select: { companyId: true },
      }),
      prisma.savedJob.findMany({
        where: { userId },
        select: { id: true, jobId: true, status: true },
      }),
    ]);

    const watchlistedIds = new Set(
      watchlistedCompanyIds.map((entry) => entry.companyId),
    );
    const savedByJobId = new Map(
      savedJobs.map((entry) => [entry.jobId, entry]),
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      jobs: jobs.map((job) => {
        const saved = savedByJobId.get(job.id);
        return {
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
          savedJob: saved
            ? {
                id: saved.id,
                status: mapSavedJobStatus(saved.status),
              }
            : null,
          company: job.company,
          ...mapMatchFields(job),
        };
      }),
      total,
      page,
      pageSize: limit,
      totalPages,
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

    const [watchlisted, savedJob] = await Promise.all([
      prisma.watchlist.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId: job.companyId,
          },
        },
        select: { id: true },
      }),
      prisma.savedJob.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId: job.id,
          },
        },
        select: { id: true, status: true },
      }),
    ]);

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
      savedJob: savedJob
        ? {
            id: savedJob.id,
            status: mapSavedJobStatus(savedJob.status),
          }
        : null,
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
