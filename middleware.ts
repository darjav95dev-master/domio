import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/infrastructure/auth/auth.config";

/**
 * Middleware for the backoffice panel.
 *
 * **Auth guard (FR-004):**
 * Redirects unauthenticated requests under `/panel/*` to `/panel/login`.
 * Skips the login page itself and internal API routes.
 *
 * **X-Robots-Tag injection (FR-012):**
 * Ensures all responses under `/panel/*` and `/api/internal/*`
 * include `X-Robots-Tag: noindex, nofollow` to prevent indexing
 * of the backoffice area by search engines.
 *
 * @see constitution.md §6 — Accesibilidad
 * @see architecture.md §7.11 — No indexación
 * @see spec.md FR-004, FR-012
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Auth guard for /panel/* (except /panel/login itself) ──
  if (pathname.startsWith("/panel") && !pathname.startsWith("/panel/login")) {
    const session = await auth();
    if (!session) {
      const loginUrl = new URL("/panel/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Inject X-Robots-Tag for backoffice and internal API routes ──
  if (
    pathname.startsWith("/panel") ||
    pathname.startsWith("/api/internal")
  ) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  // Pass through for all other routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/api/internal/:path*"],
};
