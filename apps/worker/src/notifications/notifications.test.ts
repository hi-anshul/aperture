import { describe, expect, it, vi } from "vitest";

import { enqueueNotifyJob } from "./enqueue";
import { processNotifyJob, type NotifyJobStore } from "./processor";
import {
  formatTelegramMessage,
  getTelegramConfigFromEnv,
} from "./telegram";
import {
  enqueueHighMatchNotification,
  enqueueWatchlistNotificationsForDiff,
  type HighMatchNotifyStore,
  type WatchlistNotifyStore,
} from "./triggers";
import type { JobDiff, NotifyJobQueueData } from "@aperture/shared";

function makeJob(overrides: Partial<JobDiff["newJobs"][number]> = {}) {
  return {
    id: "job-1",
    externalId: "ext-1",
    sourcePlatform: "greenhouse" as const,
    sourceUrl: "https://example.com/jobs/1",
    companyId: "co-1",
    title: "Product Manager",
    description: "Own the roadmap.",
    location: "Remote",
    workMode: "remote" as const,
    country: "US",
    employmentType: "full-time" as const,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    visaSponsorship: null,
    tags: ["product"],
    postedAt: null,
    firstSeenAt: new Date("2026-01-01"),
    lastSeenAt: new Date("2026-01-01"),
    isActive: true,
    ...overrides,
  };
}

describe("formatTelegramMessage", () => {
  it("formats dream-company and high-match copy", () => {
    const payload = {
      jobId: "j1",
      companyId: "c1",
      companyName: "Acme",
      title: "PM",
      sourceUrl: "https://example.com/j",
      matchScore: 92,
    };

    expect(formatTelegramMessage("dream-company", payload)).toContain(
      "Watchlisted company",
    );
    expect(formatTelegramMessage("high-match", payload)).toContain("92/100");
  });
});

describe("getTelegramConfigFromEnv", () => {
  it("returns null when token or chat id missing", () => {
    expect(getTelegramConfigFromEnv({})).toBeNull();
    expect(
      getTelegramConfigFromEnv({ TELEGRAM_BOT_TOKEN: "tok" }),
    ).toBeNull();
  });

  it("returns config when both set", () => {
    expect(
      getTelegramConfigFromEnv({
        TELEGRAM_BOT_TOKEN: " tok ",
        TELEGRAM_CHAT_ID: " 123 ",
      }),
    ).toEqual({ botToken: "tok", chatId: "123" });
  });
});

describe("enqueueWatchlistNotificationsForDiff", () => {
  it("enqueues dream-company for watchlisted users with notifications on", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const store: WatchlistNotifyStore = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "user-1",
            notificationChannel: "telegram",
            matchScoreThreshold: 80,
          },
        ]),
      },
      watchlist: {
        findMany: vi.fn().mockResolvedValue([{ userId: "user-1" }]),
      },
      company: {
        findUnique: vi.fn().mockResolvedValue({ id: "co-1", name: "Acme" }),
      },
    };

    const count = await enqueueWatchlistNotificationsForDiff(
      { add },
      {
        companyId: "co-1",
        newJobs: [makeJob()],
        removedJobIds: [],
        updatedJobs: [],
      },
      store,
    );

    expect(count).toBe(1);
    expect(add).toHaveBeenCalledTimes(1);
    const data = add.mock.calls[0]?.[1] as NotifyJobQueueData;
    expect(data.type).toBe("dream-company");
    expect(data.userId).toBe("user-1");
    expect(data.payload.jobId).toBe("job-1");
  });

  it("skips when company is not watchlisted", async () => {
    const add = vi.fn();
    const store: WatchlistNotifyStore = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "user-1",
            notificationChannel: "telegram",
            matchScoreThreshold: 80,
          },
        ]),
      },
      watchlist: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      company: {
        findUnique: vi.fn().mockResolvedValue({ id: "co-1", name: "Acme" }),
      },
    };

    const count = await enqueueWatchlistNotificationsForDiff(
      { add },
      {
        companyId: "co-1",
        newJobs: [makeJob()],
        removedJobIds: [],
        updatedJobs: [],
      },
      store,
    );

    expect(count).toBe(0);
    expect(add).not.toHaveBeenCalled();
  });
});

describe("enqueueHighMatchNotification", () => {
  it("enqueues when score meets threshold", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const store: HighMatchNotifyStore = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          notificationChannel: "telegram",
          matchScoreThreshold: 80,
        }),
      },
      job: {
        findUnique: vi.fn().mockResolvedValue({
          id: "job-1",
          title: "PM",
          sourceUrl: "https://example.com/j",
          companyId: "co-1",
          company: { id: "co-1", name: "Acme" },
        }),
      },
    };

    const ok = await enqueueHighMatchNotification(
      { add },
      { jobId: "job-1", userId: "user-1", score: 85 },
      store,
    );

    expect(ok).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    const data = add.mock.calls[0]?.[1] as NotifyJobQueueData;
    expect(data.type).toBe("high-match");
    expect(data.payload.matchScore).toBe(85);
  });

  it("skips when score is below threshold", async () => {
    const add = vi.fn();
    const store: HighMatchNotifyStore = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          notificationChannel: "telegram",
          matchScoreThreshold: 90,
        }),
      },
      job: {
        findUnique: vi.fn(),
      },
    };

    const ok = await enqueueHighMatchNotification(
      { add },
      { jobId: "job-1", userId: "user-1", score: 85 },
      store,
    );

    expect(ok).toBe(false);
    expect(add).not.toHaveBeenCalled();
  });
});

describe("processNotifyJob", () => {
  function createStore(): NotifyJobStore & {
    updates: unknown[];
    created: unknown[];
  } {
    const updates: unknown[] = [];
    const created: unknown[] = [];

    return {
      updates,
      created,
      notification: {
        create: vi.fn(async ({ data }) => {
          created.push(data);
          return { id: "notif-1", sentAt: null };
        }),
        update: vi.fn(async (args) => {
          updates.push(args);
          return {};
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          notificationChannel: "telegram",
        }),
      },
    };
  }

  const baseData: NotifyJobQueueData = {
    userId: "user-1",
    type: "dream-company",
    channel: "telegram",
    payload: {
      jobId: "job-1",
      companyId: "co-1",
      companyName: "Acme",
      title: "PM",
      sourceUrl: "https://example.com/j",
    },
  };

  it("sets sent_at after successful Telegram delivery", async () => {
    const store = createStore();
    const sendTelegram = vi.fn().mockResolvedValue(undefined);

    const result = await processNotifyJob(baseData, store, {
      telegramConfig: { botToken: "tok", chatId: "1" },
      sendTelegram,
    });

    expect(result.delivered).toBe(true);
    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(store.updates).toHaveLength(1);
    expect((store.updates[0] as { data: { sentAt: Date } }).data.sentAt).toBeInstanceOf(
      Date,
    );
  });

  it("leaves sent_at null and rethrows when Telegram fails", async () => {
    const store = createStore();
    const sendTelegram = vi.fn().mockRejectedValue(new Error("network"));

    await expect(
      processNotifyJob(baseData, store, {
        telegramConfig: { botToken: "tok", chatId: "1" },
        sendTelegram,
      }),
    ).rejects.toThrow("network");

    expect(store.updates).toHaveLength(0);
  });

  it("creates row but skips delivery when Telegram is unconfigured", async () => {
    const store = createStore();
    const result = await processNotifyJob(baseData, store, {
      telegramConfig: null,
    });

    expect(result.delivered).toBe(false);
    expect(result.skipped).toBe("telegram-unconfigured");
    expect(store.created).toHaveLength(1);
    expect(store.updates).toHaveLength(0);
  });
});

describe("enqueueNotifyJob", () => {
  it("adds a dispatch job with retries", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    await enqueueNotifyJob(
      { add },
      {
        userId: "u1",
        type: "high-match",
        channel: "telegram",
        payload: {
          jobId: "j1",
          companyId: "c1",
          companyName: "Acme",
          title: "PM",
          sourceUrl: "https://x",
          matchScore: 90,
        },
      },
      { jobId: "notify:high-match:u1:j1" },
    );

    expect(add).toHaveBeenCalledWith(
      "dispatch-notification",
      expect.objectContaining({ type: "high-match" }),
      expect.objectContaining({
        jobId: "notify:high-match:u1:j1",
        attempts: 3,
      }),
    );
  });
});
