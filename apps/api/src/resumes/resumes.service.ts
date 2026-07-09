import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { extractResumeFromText } from "@aperture/ai";
import { Prisma, prisma } from "@aperture/db";
import type {
  ExtractedResumeData,
  ResumeEducationEntry,
  ResumeExperienceEntry,
} from "@aperture/shared";
import { extractTextFromPdf } from "./extract-pdf-text";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const PDF_MIME = "application/pdf";

export interface ResumeResponse {
  id: string;
  fileUrl: string;
  skills: string[];
  experience: ResumeExperienceEntry[];
  education: ResumeEducationEntry[];
  keywords: string[];
  uploadedAt: string;
}

function resolveUploadDir(): string {
  return (
    process.env.RESUME_UPLOAD_DIR?.trim() ||
    path.join(process.cwd(), "uploads", "resumes")
  );
}

function isExperienceArray(value: unknown): value is ResumeExperienceEntry[] {
  return Array.isArray(value);
}

function isEducationArray(value: unknown): value is ResumeEducationEntry[] {
  return Array.isArray(value);
}

function mapResume(resume: {
  id: string;
  fileUrl: string;
  skills: string[];
  experience: Prisma.JsonValue | null;
  education: Prisma.JsonValue | null;
  keywords: string[];
  uploadedAt: Date;
}): ResumeResponse {
  return {
    id: resume.id,
    fileUrl: resume.fileUrl,
    skills: resume.skills,
    experience: isExperienceArray(resume.experience) ? resume.experience : [],
    education: isEducationArray(resume.education) ? resume.education : [],
    keywords: resume.keywords,
    uploadedAt: resume.uploadedAt.toISOString(),
  };
}

async function removeFileIfExists(fileUrl: string): Promise<void> {
  if (!fileUrl.startsWith("file://")) {
    return;
  }

  try {
    await unlink(new URL(fileUrl));
  } catch {
    // Best-effort cleanup — missing files should not fail the request.
  }
}

@Injectable()
export class ResumesService {
  async getActiveResume(userId: string): Promise<ResumeResponse | null> {
    const resume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
    });

    return resume ? mapResume(resume) : null;
  }

  async uploadResume(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<ResumeResponse> {
    if (!file) {
      throw new BadRequestException("A PDF file is required");
    }

    if (file.mimetype !== PDF_MIME) {
      throw new BadRequestException("Only PDF resumes are supported");
    }

    if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
      throw new BadRequestException(
        `PDF must be between 1 byte and ${MAX_PDF_BYTES / (1024 * 1024)}MB`,
      );
    }

    let resumeText: string;
    try {
      resumeText = await extractTextFromPdf(file.buffer);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Could not read text from the uploaded PDF",
      );
    }

    let extracted: ExtractedResumeData;
    try {
      extracted = await extractResumeFromText(resumeText);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Resume extraction failed",
      );
    }

    const uploadDir = resolveUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const filename = `${userId}-${randomUUID()}.pdf`;
    const absolutePath = path.join(uploadDir, filename);
    await writeFile(absolutePath, file.buffer);
    const fileUrl = pathToFileUrl(absolutePath);

    const previous = await prisma.resume.findMany({
      where: { userId },
      select: { id: true, fileUrl: true },
    });

    const resume = await prisma.$transaction(async (tx) => {
      if (previous.length > 0) {
        await tx.resume.deleteMany({ where: { userId } });
      }

      return tx.resume.create({
        data: {
          userId,
          fileUrl,
          skills: extracted.skills,
          experience: extracted.experience as unknown as Prisma.InputJsonValue,
          education: extracted.education as unknown as Prisma.InputJsonValue,
          keywords: extracted.keywords,
        },
      });
    });

    await Promise.all(previous.map((row) => removeFileIfExists(row.fileUrl)));

    return mapResume(resume);
  }

  async requireActiveResume(userId: string): Promise<ResumeResponse> {
    const resume = await this.getActiveResume(userId);
    if (!resume) {
      throw new NotFoundException("No active resume found");
    }
    return resume;
  }
}

function pathToFileUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized.startsWith("/") ? "" : "/"}${normalized}`;
}
