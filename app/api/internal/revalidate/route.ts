import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "@/infrastructure/auth/session";

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
 * **Auth:** Requires a valid backoffice session (auth guard).
 * Without it, any unauthenticated client could invalidate the cache.
 */
export async function POST(request: NextRequest) {
  // ── Session verification ──────────────────────────────────────────────
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      tags?: string[];
    } | null;
    const tags = body?.tags ?? [
      "catalog",
      "contact:global",
      "layout:public",
    ];

    for (const tag of tags) {
      revalidateTag(tag);
    }

    return NextResponse.json({
      revalidated: true,
      tags,
      now: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { revalidated: false, error: String(error) },
      { status: 500 },
    );
  }
}
