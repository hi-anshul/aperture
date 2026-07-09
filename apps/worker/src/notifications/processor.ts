import type {
  NotificationChannel,
  NotificationPayload,
  NotifyJobQueueData,
} from "@aperture/shared";
import {
  DEFAULT_NOTIFICATION_CHANNEL,
} from "@aperture/shared";

import {
  formatTelegramMessage,
  getTelegramConfigFromEnv,
  sendTelegramMessage,
  type TelegramConfig,
} from "./telegram";

export interface NotificationRecord {
  id: string;
  sentAt: Date | null;
}

export interface NotifyJobStore {
  notification: {
    create(args: {
      data: {
        userId: string;
        type: string;
        payload: NotificationPayload;
        channel: string;
      };
      select: { id: true; sentAt: true };
    }): Promise<NotificationRecord>;
    update(args: {
      where: { id: string };
      data: { sentAt: Date };
    }): Promise<unknown>;
  };
  user: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; notificationChannel: true };
    }): Promise<{ id: string; notificationChannel: string } | null>;
  };
}

export interface ProcessNotifyJobDeps {
  telegramConfig?: TelegramConfig | null;
  sendTelegram?: typeof sendTelegramMessage;
}

export interface ProcessNotifyJobResult {
  notificationId: string;
  delivered: boolean;
  skipped?: "channel-unimplemented" | "telegram-unconfigured" | "user-missing";
}

function asChannel(value: string): NotificationChannel {
  if (value === "email" || value === "push" || value === "telegram") {
    return value;
  }
  return DEFAULT_NOTIFICATION_CHANNEL;
}

/**
 * Creates a notifications row (sent_at null), attempts delivery, sets sent_at on success.
 * Delivery failure leaves sent_at null and rethrows so BullMQ can retry.
 */
export async function processNotifyJob(
  data: NotifyJobQueueData,
  store: NotifyJobStore,
  deps: ProcessNotifyJobDeps = {},
): Promise<ProcessNotifyJobResult> {
  const user = await store.user.findUnique({
    where: { id: data.userId },
    select: { id: true, notificationChannel: true },
  });

  if (!user) {
    return {
      notificationId: "",
      delivered: false,
      skipped: "user-missing",
    };
  }

  const channel = asChannel(user.notificationChannel || data.channel);

  const notification = await store.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      payload: data.payload,
      channel,
    },
    select: { id: true, sentAt: true },
  });

  if (channel === "email" || channel === "push") {
    console.warn(
      `[notify] Channel "${channel}" is not implemented yet — notification ${notification.id} left unsent`,
    );
    return {
      notificationId: notification.id,
      delivered: false,
      skipped: "channel-unimplemented",
    };
  }

  const telegramConfig =
    deps.telegramConfig !== undefined
      ? deps.telegramConfig
      : getTelegramConfigFromEnv();

  if (!telegramConfig) {
    console.warn(
      `[notify] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — notification ${notification.id} left unsent`,
    );
    return {
      notificationId: notification.id,
      delivered: false,
      skipped: "telegram-unconfigured",
    };
  }

  const send = deps.sendTelegram ?? sendTelegramMessage;
  const text = formatTelegramMessage(data.type, data.payload);

  try {
    await send(telegramConfig, text);
  } catch (error) {
    // Leave sent_at null for retry/debugging; rethrow so BullMQ retries.
    throw error;
  }

  await store.notification.update({
    where: { id: notification.id },
    data: { sentAt: new Date() },
  });

  return {
    notificationId: notification.id,
    delivered: true,
  };
}
