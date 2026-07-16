import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  listCompanies(@Req() request: Request) {
    return this.companiesService.listCompanies(request.user!.id);
  }

  @Post()
  createCompany(@Req() request: Request, @Body() dto: CreateCompanyDto) {
    return this.companiesService.createCompany(request.user!.id, dto);
  }

  @Post(":id/sync")
  syncCompany(@Param("id", ParseUUIDPipe) id: string) {
    return this.companiesService.syncCompany(id);
  }

  @Delete(":id")
  deleteCompany(@Param("id", ParseUUIDPipe) id: string) {
    return this.companiesService.deleteCompany(id);
  }
}
