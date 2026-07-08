import { describe, expect, it, vi } from "vitest";

import { buildFetchError } from "../fetch-engine";
import { processSyncCompany, toSyncHistoryError } from "./processor";

describe("processSyncCompany", () => {
  it("records failed sync_history without throwing from the error formatter", async () => {
    const syncHistoryUpdate = vi.fn().mockResolvedValue(undefined);
    const store = {
      syncHistory: {
        create: vi.fn().mockResolvedValue({ id: "sync-1" }),
        update: syncHistoryUpdate,
      },
      company: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      job: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      jobSource: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    await expect(
      processSyncCompany("missing-company", store as never),
    ).rejects.toThrow("Company not found: missing-company");

    expect(syncHistoryUpdate).toHaveBeenCalledWith({
      where: { id: "sync-1" },
      data: expect.objectContaining({
        status: "failed",
        errorMessage: "Company not found: missing-company",
      }),
    });
  });
});

describe("toSyncHistoryError", () => {
  it("stringifies structured fetch errors", () => {
    const error = buildFetchError({
      code: "HTTP_ERROR",
      message: "Request failed",
      url: "https://example.com",
      companyId: "company-1",
      status: 500,
      attempts: 3,
    });

    expect(toSyncHistoryError(error)).toContain('"code":"HTTP_ERROR"');
  });
});
