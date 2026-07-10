import { IsIn } from "class-validator";
import {
  SAVED_JOB_STATUSES,
  type SavedJobStatus,
} from "./create-saved-job.dto";

export class UpdateSavedJobDto {
  @IsIn(SAVED_JOB_STATUSES)
  status!: SavedJobStatus;
}
