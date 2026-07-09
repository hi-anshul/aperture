import { IsBoolean } from "class-validator";

export class UpdateWatchlistDto {
  @IsBoolean()
  notificationsEnabled!: boolean;
}
