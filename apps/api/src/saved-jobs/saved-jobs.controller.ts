import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CreateSavedJobDto } from "./dto/create-saved-job.dto";
import { UpdateSavedJobDto } from "./dto/update-saved-job.dto";
import { SavedJobsService } from "./saved-jobs.service";

@Controller("saved-jobs")
export class SavedJobsController {
  constructor(private readonly savedJobsService: SavedJobsService) {}

  @Get()
  listSavedJobs(@Req() request: Request) {
    return this.savedJobsService.listSavedJobs(request.user!.id);
  }

  @Post()
  saveJob(@Req() request: Request, @Body() dto: CreateSavedJobDto) {
    return this.savedJobsService.saveJob(request.user!.id, dto);
  }

  @Patch(":id")
  updateSavedJob(
    @Req() request: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedJobDto,
  ) {
    return this.savedJobsService.updateSavedJob(request.user!.id, id, dto);
  }
}
