import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("rtc_token")?.value;
  const path = req.nextUrl.pathname;

  const isLoginPage = path === "/login";
  const isProtectedPage = path.startsWith("/documents");

  if (!token && isProtectedPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/documents", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/documents/:path*"],
};
