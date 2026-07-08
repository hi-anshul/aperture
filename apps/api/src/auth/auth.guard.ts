import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getIronSession } from "iron-session";
import type { Request, Response } from "express";
import type { SessionData } from "@aperture/shared";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { sessionOptions } from "./session.config";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions,
    );

    if (!session.isLoggedIn || !session.userId) {
      throw new UnauthorizedException();
    }

    request.user = {
      id: session.userId,
      email: session.email ?? "",
    };

    return true;
  }
}
