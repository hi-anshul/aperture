export const SESSION_COOKIE_NAME = "aperture_session";

export interface SessionData {
  userId?: string;
  email?: string;
  isLoggedIn?: boolean;
}

export function getSessionOptions(password: string, secure = false) {
  if (password.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }

  return {
    password,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      secure,
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  };
}
