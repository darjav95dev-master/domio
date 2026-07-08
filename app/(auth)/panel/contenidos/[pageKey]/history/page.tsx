import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { ContentHistoryRepository } from "@/features/contenidos/server/content-history.repository";
import { ContentHistoryView } from "@/features/contenidos/components/ContentHistoryView";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import type { PageKey } from "@/shared/types/content.types";
import type { HistoryEntry } from "@/features/contenidos/components/ContentHistoryView";
import type { ContentType } from "@/shared/types/content.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PAGES: PageKey[] = [
  "home",
  "sobre",
  "equipo",
  "aviso-legal",
  "privacidad",
  "cookies",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ pageKey: string }>;
  searchParams: Promise<{ block?: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the user-facing label for a given page key.
 */
function pageLabel(pageKey: PageKey): string {
  const labels: Record<PageKey, string> = {
    home: "Home",
    sobre: "Sobre Domio",
    equipo: "Equipo",
    "aviso-legal": "Aviso Legal",
    privacidad: "Privacidad",
    cookies: "Cookies",
  };
  return labels[pageKey];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlockHistoryPage({ params, searchParams }: PageProps) {
  const session = await getServerSession();

  // ── Auth guard (defence-in-depth) ──────────────────────────────────
  if (!session) {
    redirect("/panel/login");
  }

  // ── Role guard ─────────────────────────────────────────────────────
  if (session.role !== "ADMIN" && session.role !== "OPERATOR") {
    redirect("/panel");
  }

  // ── Validate pageKey ───────────────────────────────────────────────
  const { pageKey } = await params;
  const { block } = await searchParams;

  if (!VALID_PAGES.includes(pageKey as PageKey) || !block) {
    notFound();
  }

  const validPageKey = pageKey as PageKey;
  const blockKey = block;
  const contentKey = `${validPageKey}:${blockKey}`;

  // ── Fetch history ──────────────────────────────────────────────────
  const authCtx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const repo = new ContentHistoryRepository(authCtx);

  let history: HistoryEntry[] = [];
  let fetchError: string | null = null;

  try {
    const rows = await repo.findByContentWithUser(
      session.tenantId, "block", contentKey,
    );
    history = rows.map((row) => ({
      id: row.id,
      contentType: row.contentType as ContentType,
      contentKey: row.contentKey,
      payloadSnapshot: row.payloadSnapshot ?? {},
      updatedBy: row.updatedByName ? { name: row.updatedByName } : null,
      createdAt: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    }));
  } catch {
    fetchError =
      "No se pudo cargar el historial. Inténtalo de nuevo más tarde.";
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg-default">
            Historial: {pageLabel(validPageKey)} / {blockKey}
          </h1>
          <Link
            href={`/panel/contenidos/${validPageKey}`}
            className="font-sans text-sm text-accent-default transition-colors duration-standard hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            ← Volver a bloques
          </Link>
        </div>

        {/* Error state */}
        {fetchError && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-card border border-status-danger-default bg-status-danger-subtle px-6 py-4"
          >
            <p className="font-sans text-sm font-semibold text-status-danger-default">
              {fetchError}
            </p>
          </div>
        )}

        {/* History view */}
        {!fetchError && (
          <ContentHistoryView history={history} />
        )}
      </div>
    </ErrorBoundary>
  );
}
