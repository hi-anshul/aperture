import { describe, expect, it } from "vitest";
import { deriveCompanyNameFromUrl } from "./derive-company-name";

describe("deriveCompanyNameFromUrl", () => {
  it("derives Greenhouse board token from path", () => {
    expect(
      deriveCompanyNameFromUrl("https://boards.greenhouse.io/stripe"),
    ).toBe("Stripe");
  });

  it("derives Greenhouse company from embed job_board for param", () => {
    expect(
      deriveCompanyNameFromUrl(
        "https://boards.greenhouse.io/embed/job_board?for=stripe",
      ),
    ).toBe("Stripe");
  });

  it("derives Lever company slug from path", () => {
    expect(deriveCompanyNameFromUrl("https://jobs.lever.co/acme")).toBe("Acme");
  });

  it("falls back to hostname when path is empty", () => {
    expect(deriveCompanyNameFromUrl("https://careers.example.com/")).toBe(
      "Careers",
    );
  });
});
