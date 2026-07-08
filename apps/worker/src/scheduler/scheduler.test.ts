import { describe, expect, it, vi } from "vitest";

import { SYNC_JOB_NAME } from "./config";
import { enqueueCompanySync, runScheduledSync } from "./run-scheduled-sync";

describe("runScheduledSync", () => {
  it("enqueues exactly one sync-company job per tracked company", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const queue = { add } as never;
    const store = {
      findMany: vi.fn().mockResolvedValue([
        { id: "company-a" },
        { id: "company-b" },
        { id: "company-c" },
      ]),
    };

    const result = await runScheduledSync(queue, store);

    expect(result.enqueued).toBe(3);
    expect(add).toHaveBeenCalledTimes(3);
    expect(add).toHaveBeenNthCalledWith(
      1,
      SYNC_JOB_NAME,
      { companyId: "company-a" },
      { removeOnComplete: true, removeOnFail: true },
    );
    expect(add).toHaveBeenNthCalledWith(
      2,
      SYNC_JOB_NAME,
      { companyId: "company-b" },
      { removeOnComplete: true, removeOnFail: true },
    );
    expect(add).toHaveBeenNthCalledWith(
      3,
      SYNC_JOB_NAME,
      { companyId: "company-c" },
      { removeOnComplete: true, removeOnFail: true },
    );
  });

  it("enqueues zero jobs when no companies are tracked", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const queue = { add } as never;
    const store = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    const result = await runScheduledSync(queue, store);

    expect(result.enqueued).toBe(0);
    expect(add).not.toHaveBeenCalled();
  });
});

describe("enqueueCompanySync", () => {
  it("uses the shared sync-company job type for manual triggers", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const queue = { add } as never;

    await enqueueCompanySync(queue, "company-123");

    expect(add).toHaveBeenCalledWith(
      SYNC_JOB_NAME,
      { companyId: "company-123" },
      { removeOnComplete: true, removeOnFail: true },
    );
  });
});
