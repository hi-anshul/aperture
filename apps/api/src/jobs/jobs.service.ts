import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@aperture/db";
import type { ListJobsQuery } from "./dto/list-jobs-query.dto";
import { buildJobWhereClause } from "./query/build-job-query";
import {
  JOB_SEARCH_PROVIDER,
  type JobSearchProvider,
} from "./search/job-search.provider";

@Injectable()
export class JobsService {
  constructor(
    @Inject(JOB_SEARCH_PROVIDER)
    private readonly searchProvider: JobSearchProvider,
  ) {}

  async listJobs(query: ListJobsQuery) {
    const { q, ...filters } = query;
    const searchConstraint = q
      ? await this.searchProvider.buildSearchConstraint(q)
      : undefined;
    const where = await buildJobWhereClause({ filters, searchConstraint });

    const jobs = await prisma.job.findMany({
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
    });

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
        company: job.company,
      })),
      total: jobs.length,
    };
  }
}
