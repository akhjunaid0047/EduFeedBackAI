import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getPayloadFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const payload = getPayloadFromToken(token);
  const role: string | null = payload?.role ?? null;
  const isExpired = payload ? payload.exp * 1000 < Date.now() : true;

  const isAuthenticated = !!role && !isExpired;

  // Public routes
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register") || pathname === "/unauthorized") {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Alumni routes
  if (pathname.startsWith("/alumni") && role !== "alumni") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Faculty routes
  if (pathname.startsWith("/faculty") && role !== "faculty") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Admin/settings — superadmin only
  if (pathname === "/admin/settings" && role !== "superadmin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Admin routes
  if (pathname.startsWith("/admin") && role !== "admin" && role !== "superadmin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/alumni/:path*", "/faculty/:path*", "/admin/:path*"],
};
