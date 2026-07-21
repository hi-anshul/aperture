import { describe, expect, it } from "vitest";
import {
  deriveCompanyNameFromUrl,
  isPlaceholderCompanyName,
} from "./derive-company-name";

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

  it("derives Workday tenant from subdomain", () => {
    expect(
      deriveCompanyNameFromUrl(
        "https://adobe.wd5.myworkdayjobs.com/external_experienced",
      ),
    ).toBe("Adobe");
    expect(
      deriveCompanyNameFromUrl("https://pg.wd5.myworkdayjobs.com/en-US/1000"),
    ).toBe("Pg");
  });

  it("prefers brand host over generic careers subdomain", () => {
    expect(
      deriveCompanyNameFromUrl(
        "https://careers.adobe.com/us/en/c/engineering-and-product-jobs",
      ),
    ).toBe("Adobe");
    expect(deriveCompanyNameFromUrl("https://jobs.example.com/openings")).toBe(
      "Example",
    );
  });

  it("falls back to hostname when path is empty", () => {
    expect(deriveCompanyNameFromUrl("https://acme.com/")).toBe("Acme");
  });
});

describe("isPlaceholderCompanyName", () => {
  it("flags generic portal labels", () => {
    expect(isPlaceholderCompanyName("Careers")).toBe(true);
    expect(isPlaceholderCompanyName("Workday")).toBe(true);
    expect(isPlaceholderCompanyName("Adobe")).toBe(false);
  });
});
