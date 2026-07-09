-- AlterTable
ALTER TABLE "users" ADD COLUMN "notificationChannel" TEXT NOT NULL DEFAULT 'telegram',
ADD COLUMN "matchScoreThreshold" INTEGER NOT NULL DEFAULT 80;
