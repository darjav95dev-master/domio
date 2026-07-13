import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/infrastructure/auth/require-auth";
import { logger } from "@/shared/utils/logger";

/**
 * Internal cache revalidation endpoint.
 *
 * Called by E2E tests after `resetDatabase()` to clear the Next.js
 * `unstable_cache` that may hold stale promocion UUIDs from before
 * the database seed reset.
 *
 * Accepts a POST request with an optional `tags` array. If no tags
 * are provided, revalidates all known cache tags used in the app.
 *
 * This route is NOT part of the public API and should NOT be
 * documented or exposed externally.
 *
 * **Auth:** Requires a valid backoffice session (ADMIN or OPERATOR only).
 */

const ALLOWED_REVALIDATE_TAGS = new Set([
  "catalog",
  "contact:global",
  "layout:public",
]);

export async function POST(request: NextRequest) {
  // ── Session verification ──────────────────────────────────────────────
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  // ── Role check — only ADMIN and OPERATOR can revalidate cache ─────────
  if (auth.ctx.role !== "ADMIN" && auth.ctx.role !== "OPERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      tags?: string[];
    } | null;
    const requested = body?.tags ?? [...ALLOWED_REVALIDATE_TAGS];
    // Only revalidate tags in the allowlist — reject arbitrary inputs
    const tags = requested.filter((t) => ALLOWED_REVALIDATE_TAGS.has(t));

    for (const tag of tags) {
      revalidateTag(tag);
    }

    return NextResponse.json({
      revalidated: true,
      tags,
      now: Date.now(),
    });
  } catch (error) {
    logger.error("Cache revalidation failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { revalidated: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
