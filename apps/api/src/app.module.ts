import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { CompaniesModule } from "./companies/companies.module";
import { JobsModule } from "./jobs/jobs.module";
import { WatchlistsModule } from "./watchlists/watchlists.module";
import { SavedJobsModule } from "./saved-jobs/saved-jobs.module";
import { ResumesModule } from "./resumes/resumes.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    AuthModule,
    CompaniesModule,
    JobsModule,
    WatchlistsModule,
    SavedJobsModule,
    ResumesModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
