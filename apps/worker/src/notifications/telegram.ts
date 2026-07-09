import type { NotificationPayload } from "@aperture/shared";

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export function getTelegramConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TelegramConfig | null {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return null;
  }

  return { botToken, chatId };
}

export function formatTelegramMessage(
  type: "dream-company" | "high-match" | "new-job",
  payload: NotificationPayload,
): string {
  const lines: string[] = [];

  if (type === "dream-company") {
    lines.push("Watchlisted company — new posting");
  } else if (type === "high-match") {
    const score =
      typeof payload.matchScore === "number"
        ? ` (${payload.matchScore}/100)`
        : "";
    lines.push(`High match${score}`);
  } else {
    lines.push("New job");
  }

  lines.push(`${payload.title} @ ${payload.companyName}`);
  lines.push(payload.sourceUrl);

  return lines.join("\n");
}

/**
 * Sends a Telegram Bot API message. Throws on non-OK HTTP so BullMQ can retry.
 * Never logs the bot token.
 */
export async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Telegram sendMessage failed: ${response.status}${body ? ` ${body.slice(0, 200)}` : ""}`,
    );
  }
}
