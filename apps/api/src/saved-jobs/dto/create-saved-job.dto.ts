import { IsIn, IsOptional, IsUUID } from "class-validator";

export const SAVED_JOB_STATUSES = [
  "interested",
  "applied",
  "rejected",
] as const;

export type SavedJobStatus = (typeof SAVED_JOB_STATUSES)[number];

export class CreateSavedJobDto {
  @IsUUID()
  jobId!: string;

  @IsOptional()
  @IsIn(SAVED_JOB_STATUSES)
  status?: SavedJobStatus;
}
