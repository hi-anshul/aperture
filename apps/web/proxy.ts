import { getIronSession } from "iron-session";
import type { SessionData } from "@aperture/shared";
import { NextRequest, NextResponse } from "next/server";
import { getWebSessionOptions } from "./lib/session";

const PROTECTED_PATHS = [
  "/dashboard",
  "/jobs",
  "/companies",
  "/watchlist",
  "/saved",
  "/resume",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    getWebSessionOptions(),
  );
  const isLoggedIn = Boolean(session.isLoggedIn && session.userId);

  if (pathname === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/dashboard" : "/login", request.url),
    );
  }

  if (isProtectedPath(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/jobs/:path*",
    "/companies/:path*",
    "/watchlist/:path*",
    "/saved/:path*",
    "/resume/:path*",
    "/settings/:path*",
  ],
};
