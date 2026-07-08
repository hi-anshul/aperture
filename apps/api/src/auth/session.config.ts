import { getSessionOptions } from "@aperture/shared";

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  return secret;
}

export const sessionOptions = getSessionOptions(
  requireSessionSecret(),
  process.env.NODE_ENV === "production",
);
