import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionCursorQuery } from "@/infrastructure/db/repositories/promocion-cursor.query";
import { CatalogFilters } from "@/features/promociones/components/catalog-filters";
import { CatalogList } from "@/features/promociones/components/catalog-list";
import type {
  PromocionStatus,
  PromocionKind,
  ConstructionStatus,
} from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads a single string value from search params.
 * Returns `undefined` if the param is missing, an array, or empty.
 */
function paramValue(
  params: Awaited<PageProps["searchParams"]>,
  key: string,
): string | undefined {
  const val = params[key];
  if (typeof val === "string" && val.length > 0) return val;
  return undefined;
}

/**
 * Parses a positive integer from search params.
 * Falls back to the given default if missing or invalid.
 */
function paramInt(
  params: Awaited<PageProps["searchParams"]>,
  key: string,
  defaultVal: number,
): number {
  const val = paramValue(params, key);
  if (!val) return defaultVal;
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultVal;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CatalogoPage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/panel/login");
  }

  const params = await searchParams;

  // ── Parse filters ──────────────────────────────────────────────────────
  const filters: Parameters<PromocionCursorQuery["findAllWithCursor"]>[0] = {};

  const status = paramValue(params, "status");
  if (status) filters.status = status as PromocionStatus;

  const kind = paramValue(params, "kind");
  if (kind) filters.kind = kind as PromocionKind;

  const island = paramValue(params, "island");
  if (island) filters.island = island;

  const municipality = paramValue(params, "municipality");
  if (municipality) filters.municipality = municipality;

  const constructionStatus = paramValue(params, "constructionStatus");
  if (constructionStatus)
    filters.constructionStatus = constructionStatus as ConstructionStatus;

  // ── Parse pagination ───────────────────────────────────────────────────
  const limit = paramInt(params, "limit", 20);
  const cursor = paramValue(params, "cursor");
  // ── Fetch data ─────────────────────────────────────────────────────────
  const ctx = new AuthenticatedContext(
    session.tenantId,
    session.userId,
    session.role,
  );
  const cursorQuery = new PromocionCursorQuery(ctx);

  // Always use cursor-based pagination. Absence of cursor = first page (cursor = "").
  const result = await cursorQuery.findAllWithCursor(filters, {
    cursor: cursor ?? "",
    limit,
  });

  // Map to CatalogListItem
  const catalogItems = result.items.map((item) => ({
    id: item.id,
    name: item.name,
    propertyType: item.propertyType,
    operation: item.operation,
    status: item.status,
    kind: item.kind,
    municipality: item.municipality,
    assignedAgentName: item.assignedAgentName,
  }));

  return (
    <CursorCatalogPage
      catalogItems={catalogItems}
      total={result.total}
      nextCursor={result.nextCursor}
      params={params}
    />
  );
}

// ---------------------------------------------------------------------------
// Cursor-based catalog page
// ---------------------------------------------------------------------------

async function CursorCatalogPage({
  catalogItems,
  total,
  nextCursor,
  params,
}: {
  catalogItems: Array<{
    id: string;
    name: string;
    propertyType: string | null;
    operation: string | null;
    status: string;
    kind: string;
    municipality: string | null;
    assignedAgentName: string | null;
  }>;
  total: number;
  nextCursor: string | null;
  params: Record<string, string | string[] | undefined>;
}) {
  // Build current params for nav links
  const baseParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0 && key !== "cursor" && key !== "prev") {
      baseParams.set(key, value);
    }
  }
  const limit = baseParams.get("limit") ?? "20";
  baseParams.set("limit", limit);
  const baseQs = baseParams.toString();

  const prevHref = baseQs.length > 0 ? `?${baseQs}` : "?";
  const nextHref = nextCursor
    ? `?${baseParams.toString()}&cursor=${encodeURIComponent(nextCursor)}&prev=1`
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg-default">
          Catálogo
        </h1>
        <Link
          href="/panel/catalogo/nueva"
          className="rounded-pill bg-accent-default px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors duration-deliberate ease-standard hover:bg-accent-hover focus-visible:outline-offset-[-2px]"
        >
          Nueva promoción
        </Link>
      </div>

      {/* Filters */}
      <CatalogFilters />

      {/* List */}
      <CatalogList
        items={catalogItems}
        total={total}
        page={1}
        limit={Number(limit)}
        currentParams=""
        nextCursor={nextCursor}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  );
}

