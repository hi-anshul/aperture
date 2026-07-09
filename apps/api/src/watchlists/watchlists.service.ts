import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, prisma } from "@aperture/db";
import type { PlatformType } from "@aperture/shared";
import type { CreateWatchlistDto } from "./dto/create-watchlist.dto";
import type { UpdateWatchlistDto } from "./dto/update-watchlist.dto";

function mapWatchlistEntry(entry: {
  id: string;
  notificationsEnabled: boolean;
  createdAt: Date;
  company: {
    id: string;
    name: string;
    careersUrl: string;
    platform: string;
    logoUrl: string | null;
    syncHistory: Array<{
      startedAt: Date;
      finishedAt: Date | null;
      status: string;
      jobsFound: number;
      jobsNew: number;
      jobsRemoved: number;
    }>;
  };
}) {
  const latestSync = entry.company.syncHistory[0] ?? null;

  return {
    id: entry.id,
    notificationsEnabled: entry.notificationsEnabled,
    createdAt: entry.createdAt.toISOString(),
    company: {
      id: entry.company.id,
      name: entry.company.name,
      careersUrl: entry.company.careersUrl,
      platform: entry.company.platform as PlatformType,
      logoUrl: entry.company.logoUrl,
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
    },
  };
}

@Injectable()
export class WatchlistsService {
  async listWatchlists(userId: string) {
    const entries = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        company: {
          include: {
            syncHistory: {
              orderBy: { startedAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return {
      watchlists: entries.map(mapWatchlistEntry),
      total: entries.length,
    };
  }

  async addToWatchlist(userId: string, dto: CreateWatchlistDto) {
    const company = await prisma.company.findUnique({
      where: { id: dto.companyId },
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: dto.companyId,
        },
      },
      include: {
        company: {
          include: {
            syncHistory: {
              orderBy: { startedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (existing) {
      return mapWatchlistEntry(existing);
    }

    try {
      const created = await prisma.watchlist.create({
        data: {
          userId,
          companyId: dto.companyId,
        },
        include: {
          company: {
            include: {
              syncHistory: {
                orderBy: { startedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      return mapWatchlistEntry(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Company is already on the watchlist");
      }
      throw error;
    }
  }

  async removeFromWatchlist(userId: string, watchlistId: string) {
    const entry = await prisma.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId,
      },
    });

    if (!entry) {
      throw new NotFoundException("Watchlist entry not found");
    }

    await prisma.watchlist.delete({
      where: { id: watchlistId },
    });

    return { ok: true };
  }

  async updateWatchlist(
    userId: string,
    watchlistId: string,
    dto: UpdateWatchlistDto,
  ) {
    const entry = await prisma.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId,
      },
    });

    if (!entry) {
      throw new NotFoundException("Watchlist entry not found");
    }

    const updated = await prisma.watchlist.update({
      where: { id: watchlistId },
      data: {
        notificationsEnabled: dto.notificationsEnabled,
      },
      include: {
        company: {
          include: {
            syncHistory: {
              orderBy: { startedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    return mapWatchlistEntry(updated);
  }
}
