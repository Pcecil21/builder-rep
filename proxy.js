import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-config";

export function proxy(request) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionCookie);
  const { pathname } = request.nextUrl;

  if (!isAuthenticated && pathname.startsWith("/studio")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*"],
};
