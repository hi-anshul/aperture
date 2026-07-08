import { Controller, Get, Query } from "@nestjs/common";
import { parseListJobsQuery } from "./dto/list-jobs-query.dto";
import { JobsService } from "./jobs.service";

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  listJobs(
    @Query() raw: Record<string, string | string[] | undefined>,
  ) {
    return this.jobsService.listJobs(parseListJobsQuery(raw));
  }
}
