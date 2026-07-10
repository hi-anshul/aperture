import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateSavedJobDto } from "./create-saved-job.dto";
import { UpdateSavedJobDto } from "./update-saved-job.dto";

describe("CreateSavedJobDto", () => {
  it("accepts jobId with default status omitted", async () => {
    const dto = plainToInstance(CreateSavedJobDto, {
      jobId: "11111111-1111-4111-8111-111111111111",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("accepts an explicit interested/applied/rejected status", async () => {
    const dto = plainToInstance(CreateSavedJobDto, {
      jobId: "11111111-1111-4111-8111-111111111111",
      status: "applied",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects an unknown status", async () => {
    const dto = plainToInstance(CreateSavedJobDto, {
      jobId: "11111111-1111-4111-8111-111111111111",
      status: "interviewing",
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("UpdateSavedJobDto", () => {
  it("requires a valid status", async () => {
    const valid = plainToInstance(UpdateSavedJobDto, { status: "rejected" });
    const invalid = plainToInstance(UpdateSavedJobDto, { status: "ghosted" });

    expect(await validate(valid)).toHaveLength(0);
    expect((await validate(invalid)).length).toBeGreaterThan(0);
  });
});
