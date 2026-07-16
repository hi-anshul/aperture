import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { detectAndPersistPlatform } from "@aperture/connectors";
import { prisma } from "@aperture/db";
import type { PlatformType } from "@aperture/shared";
import { deriveCompanyNameFromUrl } from "./derive-company-name";
import type { CreateCompanyDto } from "./dto/create-company.dto";
import { enqueueCompanySync } from "./sync-queue";

function normalizeCareersUrl(careersUrl: string): string {
  const url = new URL(careersUrl.trim());
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function mapCompany(
  company: {
    id: string;
    name: string;
    careersUrl: string;
    platform: string;
    logoUrl: string | null;
    createdAt: Date;
    syncHistory: Array<{
      startedAt: Date;
      finishedAt: Date | null;
      status: string;
      jobsFound: number;
      jobsNew: number;
      jobsRemoved: number;
    }>;
    watchlists: Array<{
      id: string;
      notificationsEnabled: boolean;
    }>;
  },
) {
  const latestSync = company.syncHistory[0] ?? null;
  const watchlist = company.watchlists[0] ?? null;

  return {
    id: company.id,
    name: company.name,
    careersUrl: company.careersUrl,
    platform: company.platform as PlatformType,
    logoUrl: company.logoUrl,
    createdAt: company.createdAt.toISOString(),
    lastSync: latestSync
      ? {
          startedAt: latestSync.startedAt.toISOString(),
          finishedAt: latestSync.finishedAt?.toISOString() ?? null,
          status: latestSync.status,
          jobsFound: latestSync.jobsFound,
          jobsNew: latestSync.jobsNew,
          jobsRemoved: latestSync.jobsRemoved,
        }
      : null,
    watchlist: watchlist
      ? {
          id: watchlist.id,
          notificationsEnabled: watchlist.notificationsEnabled,
        }
      : null,
  };
}

@Injectable()
export class CompaniesService {
  async listCompanies(userId: string) {
    const companies = await prisma.company.findMany({
      include: {
        syncHistory: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
        watchlists: {
          where: { userId },
          select: {
            id: true,
            notificationsEnabled: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    return {
      companies: companies.map(mapCompany),
      total: companies.length,
    };
  }

  async createCompany(userId: string, dto: CreateCompanyDto) {
    const careersUrl = normalizeCareersUrl(dto.careersUrl);
    const existing = await prisma.company.findUnique({
      where: { careersUrl },
      include: {
        syncHistory: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
        watchlists: {
          where: { userId },
          select: {
            id: true,
            notificationsEnabled: true,
          },
        },
      },
    });

    if (existing) {
      throw new ConflictException("A company with this careers URL already exists");
    }

    const company = await prisma.company.create({
      data: {
        name: dto.name?.trim() || deriveCompanyNameFromUrl(careersUrl),
        careersUrl,
        platform: "unknown",
      },
      include: {
        syncHistory: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
        watchlists: {
          where: { userId },
          select: {
            id: true,
            notificationsEnabled: true,
          },
        },
      },
    });

    try {
      await detectAndPersistPlatform(company.id, prisma);
    } catch {
      // Platform detection failure should not block company creation.
    }

    const refreshed = await prisma.company.findUnique({
      where: { id: company.id },
      include: {
        syncHistory: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
        watchlists: {
          where: { userId },
          select: {
            id: true,
            notificationsEnabled: true,
          },
        },
      },
    });

    if (!refreshed) {
      throw new NotFoundException("Company not found after creation");
    }

    return mapCompany(refreshed);
  }

  /**
   * Enqueues an async company sync. Never runs fetch/parse on the request path.
   */
  async syncCompany(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    try {
      await enqueueCompanySync(company.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to enqueue sync";
      if (message.includes("REDIS_URL")) {
        throw new ServiceUnavailableException(message);
      }
      throw error;
    }

    return {
      companyId: company.id,
      status: "queued" as const,
    };
  }

  /**
   * Removes a company and its related tracking data (jobs, sources, sync
   * history, watchlists). Saved-job rows for that company's postings are
   * deleted first to satisfy FK constraints.
   */
  async deleteCompany(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    await prisma.$transaction(async (tx) => {
      const jobs = await tx.job.findMany({
        where: { companyId },
        select: { id: true },
      });
      const jobIds = jobs.map((job) => job.id);

      if (jobIds.length > 0) {
        await tx.savedJob.deleteMany({
          where: { jobId: { in: jobIds } },
        });
      }

      await tx.job.deleteMany({ where: { companyId } });
      await tx.jobSource.deleteMany({ where: { companyId } });
      await tx.syncHistory.deleteMany({ where: { companyId } });
      await tx.watchlist.deleteMany({ where: { companyId } });
      await tx.company.delete({ where: { id: companyId } });
    });

    return { ok: true };
  }
}
