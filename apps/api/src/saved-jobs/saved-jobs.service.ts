import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, prisma } from "@aperture/db";
import type { CreateSavedJobDto } from "./dto/create-saved-job.dto";
import type { UpdateSavedJobDto } from "./dto/update-saved-job.dto";
import {
  SAVED_JOB_STATUSES,
  type SavedJobStatus,
} from "./dto/create-saved-job.dto";

const savedJobInclude = {
  job: {
    select: {
      id: true,
      title: true,
      location: true,
      workMode: true,
      sourceUrl: true,
      sourcePlatform: true,
      matchScore: true,
      matchVerdict: true,
      postedAt: true,
      firstSeenAt: true,
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  },
} as const;

function isSavedJobStatus(value: string): value is SavedJobStatus {
  return (SAVED_JOB_STATUSES as readonly string[]).includes(value);
}

function mapSavedJob(entry: {
  id: string;
  status: string;
  createdAt: Date;
  job: {
    id: string;
    title: string;
    location: string | null;
    workMode: string | null;
    sourceUrl: string;
    sourcePlatform: string;
    matchScore: number | null;
    matchVerdict: string | null;
    postedAt: Date | null;
    firstSeenAt: Date;
    company: {
      id: string;
      name: string;
      logoUrl: string | null;
    };
  };
}) {
  const status = isSavedJobStatus(entry.status) ? entry.status : "interested";
  const verdict =
    entry.job.matchVerdict === "good-match" ||
    entry.job.matchVerdict === "weak-match"
      ? entry.job.matchVerdict
      : null;

  return {
    id: entry.id,
    status,
    createdAt: entry.createdAt.toISOString(),
    job: {
      id: entry.job.id,
      title: entry.job.title,
      location: entry.job.location,
      workMode: entry.job.workMode,
      sourceUrl: entry.job.sourceUrl,
      sourcePlatform: entry.job.sourcePlatform,
      matchScore: entry.job.matchScore,
      matchVerdict: verdict,
      postedAt: entry.job.postedAt?.toISOString() ?? null,
      firstSeenAt: entry.job.firstSeenAt.toISOString(),
      company: entry.job.company,
    },
  };
}

@Injectable()
export class SavedJobsService {
  async listSavedJobs(userId: string) {
    const entries = await prisma.savedJob.findMany({
      where: { userId },
      include: savedJobInclude,
      orderBy: [{ createdAt: "desc" }],
    });

    return {
      savedJobs: entries.map(mapSavedJob),
      total: entries.length,
    };
  }

  async saveJob(userId: string, dto: CreateSavedJobDto) {
    const job = await prisma.job.findUnique({
      where: { id: dto.jobId },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    const status = dto.status ?? "interested";

    const existing = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId: dto.jobId,
        },
      },
      include: savedJobInclude,
    });

    if (existing) {
      return mapSavedJob(existing);
    }

    try {
      const created = await prisma.savedJob.create({
        data: {
          userId,
          jobId: dto.jobId,
          status,
        },
        include: savedJobInclude,
      });

      return mapSavedJob(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Job is already saved");
      }
      throw error;
    }
  }

  async updateSavedJob(
    userId: string,
    savedJobId: string,
    dto: UpdateSavedJobDto,
  ) {
    const entry = await prisma.savedJob.findFirst({
      where: {
        id: savedJobId,
        userId,
      },
    });

    if (!entry) {
      throw new NotFoundException("Saved job not found");
    }

    const updated = await prisma.savedJob.update({
      where: { id: savedJobId },
      data: {
        status: dto.status,
      },
      include: savedJobInclude,
    });

    return mapSavedJob(updated);
  }
}
