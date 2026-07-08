import { Injectable, UnauthorizedException } from "@nestjs/common";
import { compare } from "bcryptjs";
import { prisma } from "@aperture/db";
import {
  DUMMY_PASSWORD_HASH,
  INVALID_CREDENTIALS_MESSAGE,
} from "./auth.constants";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  async validateCredentials(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await compare(password, passwordHash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return user;
  }
}
