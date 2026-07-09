import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { detectAndPersistPlatform } from "@aperture/connectors";
import { prisma } from "@aperture/db";
import type { PlatformType } from "@aperture/shared";
import { deriveCompanyNameFromUrl } from "./derive-company-name";
import type { CreateCompanyDto } from "./dto/create-company.dto";

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
}
