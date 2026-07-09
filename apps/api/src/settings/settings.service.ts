import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@aperture/db";
import {
  DEFAULT_MATCH_SCORE_THRESHOLD,
  DEFAULT_NOTIFICATION_CHANNEL,
  type NotificationChannel,
} from "@aperture/shared";
import type { UpdateSettingsDto } from "./dto/update-settings.dto";

function asChannel(value: string): NotificationChannel {
  if (value === "email" || value === "push" || value === "telegram") {
    return value;
  }
  return DEFAULT_NOTIFICATION_CHANNEL;
}

function mapSettings(user: {
  notificationChannel: string;
  matchScoreThreshold: number;
}) {
  return {
    notificationChannel: asChannel(user.notificationChannel),
    matchScoreThreshold:
      typeof user.matchScoreThreshold === "number"
        ? user.matchScoreThreshold
        : DEFAULT_MATCH_SCORE_THRESHOLD,
  };
}

@Injectable()
export class SettingsService {
  async getSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationChannel: true,
        matchScoreThreshold: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return mapSettings(user);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.notificationChannel !== undefined
          ? { notificationChannel: dto.notificationChannel }
          : {}),
        ...(dto.matchScoreThreshold !== undefined
          ? { matchScoreThreshold: dto.matchScoreThreshold }
          : {}),
      },
      select: {
        notificationChannel: true,
        matchScoreThreshold: true,
      },
    });

    return mapSettings(updated);
  }
}
