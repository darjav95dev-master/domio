import { eq, and, desc, count, lt, or } from "drizzle-orm";
import {
  promociones,
  users,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";
import type {
  PromocionStatus,
  PromocionKind,
  ConstructionStatus,
} from "@/shared/constants/db-enums";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/domain-config";
import { encodeCursor, decodeCursor } from "@/infrastructure/db/repositories/cursor-encoder";

// ---------------------------------------------------------------------------
// Shared select columns
// ---------------------------------------------------------------------------

export const PROMOCION_SELECT_COLUMNS = {
  id: promociones.id,
  tenantId: promociones.tenantId,
  slug: promociones.slug,
  name: promociones.name,
  kind: promociones.kind,
  status: promociones.status,
  operation: promociones.operation,
  propertyType: promociones.propertyType,
  constructionStatus: promociones.constructionStatus,
  island: promociones.island,
  municipality: promociones.municipality,
  address: promociones.address,
  location: promociones.location,
  locationApprox: promociones.locationApprox,
  mapPrivacyMode: promociones.mapPrivacyMode,
  seoTitle: promociones.seoTitle,
  seoDescription: promociones.seoDescription,
  assignedAgentId: promociones.assignedAgentId,
  assignedAgentName: users.name,
  draftPayload: promociones.draftPayload,
  createdAt: promociones.createdAt,
  updatedAt: promociones.updatedAt,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromocionFilters {
  status?: PromocionStatus;
  kind?: PromocionKind;
  island?: string;
  municipality?: string;
  assignedAgentId?: string;
  constructionStatus?: ConstructionStatus;
}

type PromocionRow = typeof promociones.$inferSelect;

/** Row returned by findAllWithCursor — includes assignedAgentName from users join. */
export type PromocionListRow = PromocionRow & {
  assignedAgentName: string | null;
};

/** Row returned by findAllWithCursor — cursor-based pagination result. */
export interface CursorResult {
  items: PromocionListRow[];
  nextCursor: string | null;
  total: number;
}

// ---------------------------------------------------------------------------
// Cursor Query — extraída de PromocionRepository (responsabilidad única:
// cursor pagination con filtros)
// ---------------------------------------------------------------------------

export class PromocionCursorQuery extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext | null;

  constructor(ctx: TenantContext) {
    super(ctx);
    this.authCtx = ctx.type === "authenticated" ? (ctx as AuthenticatedContext) : null;
  }

  buildFilterConditions(filters: PromocionFilters): ReturnType<typeof eq>[] {
    const conditions: ReturnType<typeof eq>[] = [
      eq(promociones.tenantId, this.ctx.getTenantId()),
    ];
    if (filters.status) conditions.push(eq(promociones.status, filters.status));
    if (filters.kind) conditions.push(eq(promociones.kind, filters.kind));
    if (filters.island) conditions.push(eq(promociones.island, filters.island));
    if (filters.municipality) conditions.push(eq(promociones.municipality, filters.municipality));
    if (filters.constructionStatus) conditions.push(eq(promociones.constructionStatus, filters.constructionStatus));
    if (!this.authCtx) throw new Error("Este método requiere contexto autenticado");
    if (this.authCtx.role === "AGENT") {
      conditions.push(eq(promociones.assignedAgentId, this.authCtx.userId));
    } else if (filters.assignedAgentId) {
      conditions.push(eq(promociones.assignedAgentId, filters.assignedAgentId));
    }
    return conditions;
  }

  async findAllWithCursor(
    filters: PromocionFilters,
    options: { cursor?: string; limit?: number } = {},
  ): Promise<CursorResult> {
    return this.withTransaction(async (tx) => {
      const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE), 100);
      const whereClause = and(...this.buildFilterConditions(filters));

      // Calculate total only on first page
      let total = 0;
      if (!options.cursor) {
        const [totalRow] = await tx
          .select({ count: count() })
          .from(promociones)
          .where(whereClause);
        total = Number(totalRow?.count ?? 0);
        if (total === 0) {
          return { items: [], nextCursor: null, total: 0 };
        }
      }

      // Apply cursor: fetch items after the cursor position
      const cursorConditions: ReturnType<typeof or>[] = [];
      if (options.cursor) {
        const { sortKey, id } = decodeCursor(options.cursor);
        const cursorDate = new Date(sortKey);
        cursorConditions.push(
          or(
            lt(promociones.updatedAt, cursorDate),
            and(
              eq(promociones.updatedAt, cursorDate),
              lt(promociones.id, id),
            ),
          ),
        );
      }

      const fullWhere = cursorConditions.length > 0
        ? and(whereClause, ...cursorConditions)
        : whereClause;

      const items = await tx
        .select(PROMOCION_SELECT_COLUMNS)
        .from(promociones)
        .leftJoin(users, eq(promociones.assignedAgentId, users.id))
        .where(fullWhere)
        .orderBy(desc(promociones.updatedAt), desc(promociones.id))
        .limit(limit + 1);

      const hasMore = items.length > limit;
      const pageItems = hasMore ? items.slice(0, limit) : items;

      let nextCursor: string | null = null;
      if (hasMore && pageItems.length > 0) {
        const last = pageItems[pageItems.length - 1]!;
        nextCursor = encodeCursor(last.updatedAt.toISOString(), last.id);
      }

      return { items: pageItems, nextCursor, total };
    });
  }
}
