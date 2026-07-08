import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { getIronSession } from "iron-session";
import type { Request, Response } from "express";
import type { SessionData } from "@aperture/shared";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./public.decorator";
import { sessionOptions } from "./session.config";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateCredentials(dto);
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions,
    );

    session.userId = user.id;
    session.email = user.email;
    session.isLoggedIn = true;
    await session.save();

    return { ok: true };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions,
    );
    session.destroy();

    return { ok: true };
  }

  @Get("me")
  me(@Req() request: Request) {
    const user = request.user!;
    return {
      id: user.id,
      email: user.email,
    };
  }
}
