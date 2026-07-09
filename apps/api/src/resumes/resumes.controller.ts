import {
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request } from "express";
import { ResumesService } from "./resumes.service";

@Controller("resumes")
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  getActiveResume(@Req() request: Request) {
    return this.resumesService.getActiveResume(request.user!.id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadResume(
    @Req() request: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.resumesService.uploadResume(request.user!.id, file);
  }
}
