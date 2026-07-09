import { Body, Controller, Get, Patch, Req } from "@nestjs/common";
import type { Request } from "express";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@Req() request: Request) {
    return this.settingsService.getSettings(request.user!.id);
  }

  @Patch()
  updateSettings(@Req() request: Request, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(request.user!.id, dto);
  }
}
