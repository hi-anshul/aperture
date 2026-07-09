import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import type { NotificationChannel } from "@aperture/shared";

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(["email", "push", "telegram"])
  notificationChannel?: NotificationChannel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  matchScoreThreshold?: number;
}
