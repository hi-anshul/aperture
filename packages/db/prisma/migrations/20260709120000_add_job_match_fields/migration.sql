-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "matchScore" INTEGER,
ADD COLUMN "matchVerdict" TEXT,
ADD COLUMN "matchMissingSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "matchExplanation" TEXT,
ADD COLUMN "matchedResumeId" TEXT,
ADD COLUMN "matchedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "jobs_matchScore_idx" ON "jobs"("matchScore");
