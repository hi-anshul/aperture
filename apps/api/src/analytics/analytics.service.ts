import { Injectable } from "@nestjs/common";
import { prisma } from "@aperture/db";
import type { AnalyticsWindowDays } from "./dto/analytics-query.dto";

export interface AnalyticsResponse {
  windowDays: AnalyticsWindowDays;
  windowStart: string;
  windowEnd: string;
  jobsFound: number;
  applied: number;
  ignored: number;
  companiesHiring: number;
  averageMatchScore: number | null;
}

function windowStartFor(windowDays: AnalyticsWindowDays, now: Date): Date {
  return new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
}

function roundAverage(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

@Injectable()
export class AnalyticsService {
  async getAnalytics(
    userId: string,
    windowDays: AnalyticsWindowDays,
  ): Promise<AnalyticsResponse> {
    const windowEnd = new Date();
    const windowStart = windowStartFor(windowDays, windowEnd);

    const inWindow = {
      firstSeenAt: { gte: windowStart },
    } as const;

    const [jobsFound, applied, ignored, hiringGroups, matchAggregate] =
      await Promise.all([
        prisma.job.count({
          where: inWindow,
        }),
        prisma.savedJob.count({
          where: {
            userId,
            status: "applied",
            job: inWindow,
          },
        }),
        prisma.job.count({
          where: {
            ...inWindow,
            savedJobs: {
              none: { userId },
            },
          },
        }),
        prisma.job.groupBy({
          by: ["companyId"],
          where: {
            ...inWindow,
            isActive: true,
          },
        }),
        prisma.job.aggregate({
          where: {
            ...inWindow,
            matchScore: { not: null },
          },
          _avg: { matchScore: true },
        }),
      ]);

    return {
      windowDays,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      jobsFound,
      applied,
      ignored,
      companiesHiring: hiringGroups.length,
      averageMatchScore: roundAverage(matchAggregate._avg.matchScore),
    };
  }
}
