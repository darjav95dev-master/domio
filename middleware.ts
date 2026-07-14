import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkLoginRateLimit } from "@/infrastructure/auth/rate-limit-login";
import { isPublicPanelRoute } from "@/shared/constants/panel-routes";

/**
 * Middleware for the backoffice panel.
 *
 * **Auth guard (FR-004):**
 * Redirects unauthenticated requests under `/panel/*` to `/panel/login`.
 * Uses getToken() from next-auth/jwt — Edge-compatible JWT verification.
 *
 * **X-Robots-Tag injection (FR-012):**
 * Ensures all responses under `/panel/*` and `/api/internal/*`
 * include `X-Robots-Tag: noindex, nofollow` to prevent indexing
 * of the backoffice area by search engines.
 *
 * **Login rate limiting (SEC-CRIT-01):**
 * Rate limits POST requests to `/api/auth/callback/credentials`
 * based on client IP to prevent brute-force attacks.
 *
 * @see constitution.md §6 — Accesibilidad
 * @see architecture.md §7.11 — No indexación
 * @see spec.md FR-004, FR-012
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Login rate limiting for brute-force protection ──
  if (pathname === "/api/auth/callback/credentials" && request.method === "POST") {
    const rateLimitResponse = await checkLoginRateLimit(request.headers);
    if (rateLimitResponse) return rateLimitResponse;
  }

  // ── Auth guard for /panel/* (excepto las rutas públicas de acceso) ──
  if (pathname.startsWith("/panel") && !isPublicPanelRoute(pathname)) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
    if (!token) {
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
    // Expose the pathname so layouts can read it via headers()
    response.headers.set("x-pathname", pathname);
    return response;
  }

  // Pass through for all other routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/api/internal/:path*", "/api/auth/callback/credentials"],
};
