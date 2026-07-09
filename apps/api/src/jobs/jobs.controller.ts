import { Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { parseListJobsQuery } from "./dto/list-jobs-query.dto";
import { JobsService } from "./jobs.service";

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  listJobs(
    @Req() request: Request,
    @Query() raw: Record<string, string | string[] | undefined>,
  ) {
    return this.jobsService.listJobs(
      request.user!.id,
      parseListJobsQuery(raw),
    );
  }

  @Get(":id")
  getJob(@Req() request: Request, @Param("id") id: string) {
    return this.jobsService.getJob(request.user!.id, id);
  }

  @Post(":id/rescore")
  rescoreJob(@Req() request: Request, @Param("id") id: string) {
    return this.jobsService.rescoreJob(request.user!.id, id);
  }
}
