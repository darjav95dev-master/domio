export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { ContentBlockRepository } from "@/features/contenidos/server/content-block.repository";
import { ContentBlockEditor } from "@/features/contenidos/components/ContentBlockEditor";
import { EmptyContentState } from "@/features/contenidos/components/EmptyContentState";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import type { PageKey } from "@/shared/types/content.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PAGES = new Set<PageKey>([
  "home",
  "sobre",
  "equipo",
  "aviso-legal",
  "privacidad",
  "cookies",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  readonly params: Promise<{ readonly pageKey: string }>;
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

export default async function PageKeyContentPage({ params }: PageProps) {
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

  if (!VALID_PAGES.has(pageKey as PageKey)) {
    notFound();
  }

  const validPageKey = pageKey as PageKey;

  // ── Fetch blocks ───────────────────────────────────────────────────
  const authCtx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const repo = new ContentBlockRepository(authCtx);

  let blocks: Awaited<ReturnType<typeof repo.findByTenantAndPage>> = [];

  let fetchError: string | null = null;

  try {
    blocks = await repo.findByTenantAndPage(session.tenantId, validPageKey);
  } catch {
    fetchError =
      "No se pudieron cargar los bloques de contenido. Inténtalo de nuevo más tarde.";
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-fg-default">
            {pageLabel(validPageKey)}
          </h1>
          <Link
            href="/panel/contenidos"
            className="font-sans text-sm text-accent-default transition-colors duration-standard hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            ← Volver a páginas
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

        {/* Empty state */}
        {!fetchError && blocks.length === 0 && (
          <EmptyContentState pageKey={validPageKey} />
        )}

        {/* Blocks */}
        {!fetchError && blocks.length > 0 && (
          <div className="flex flex-col gap-6">
            {blocks.map((block) => (
              <ContentBlockEditor
                key={block.id}
                pageKey={validPageKey}
                blockKey={block.blockKey as import("@/shared/types/content.types").BlockKey}
                initialPayload={block.payload ?? {}}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
