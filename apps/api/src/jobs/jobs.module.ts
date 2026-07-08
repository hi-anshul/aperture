import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { PostgresIlikeJobSearch } from "./search/postgres-ilike-search";
import { JOB_SEARCH_PROVIDER } from "./search/job-search.provider";

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    {
      provide: JOB_SEARCH_PROVIDER,
      useClass: PostgresIlikeJobSearch,
    },
  ],
})
export class JobsModule {}
