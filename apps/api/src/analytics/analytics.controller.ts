import { Controller, Get, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { AnalyticsService } from "./analytics.service";
import { parseAnalyticsQuery } from "./dto/analytics-query.dto";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  getAnalytics(
    @Req() request: Request,
    @Query() raw: Record<string, string | string[] | undefined>,
  ) {
    const { windowDays } = parseAnalyticsQuery(raw);
    return this.analyticsService.getAnalytics(request.user!.id, windowDays);
  }
}
