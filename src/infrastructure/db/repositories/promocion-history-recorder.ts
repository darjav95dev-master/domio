import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { PromocionHistoryRepository } from "@/infrastructure/db/repositories/promocion-history.repository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";

// ---------------------------------------------------------------------------
// History Recorder — extraída de PromocionRepository (responsabilidad única:
// field-level history recording para promociones)
// ---------------------------------------------------------------------------

export class PromocionHistoryRecorder extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext | null;

  constructor(ctx: TenantContext) {
    super(ctx);
    this.authCtx = ctx.type === "authenticated" ? (ctx as AuthenticatedContext) : null;
  }

  /** Field mapping for history comparison (shared between update and history). */
  static readonly HISTORY_FIELDS: Array<{ key: string; fieldName: string }> = [
    { key: "name", fieldName: "name" },
    { key: "kind", fieldName: "kind" },
    { key: "status", fieldName: "status" },
    { key: "operation", fieldName: "operation" },
    { key: "propertyType", fieldName: "propertyType" },
    { key: "constructionStatus", fieldName: "constructionStatus" },
    { key: "island", fieldName: "island" },
    { key: "municipality", fieldName: "municipality" },
    { key: "address", fieldName: "address" },
    { key: "location", fieldName: "location" },
    { key: "locationApprox", fieldName: "locationApprox" },
    { key: "mapPrivacyMode", fieldName: "mapPrivacyMode" },
    { key: "seoTitle", fieldName: "seoTitle" },
    { key: "seoDescription", fieldName: "seoDescription" },
    { key: "assignedAgentId", fieldName: "assignedAgentId" },
    { key: "slug", fieldName: "slug" },
    { key: "draftPayload", fieldName: "draftPayload" },
  ];

  /** Ensures auth context is available, throwing if not. */
  private requireAuth(): AuthenticatedContext {
    if (!this.authCtx) {
      throw new Error("Authentication required for this operation");
    }
    return this.authCtx;
  }

  /**
   * Records field-level history for changed promoción fields.
   * Excludes internal fields (slug, draftPayload) from history.
   */
  async recordHistory(
    tx: Transaction,
    id: string,
    current: Record<string, unknown>,
    data: Record<string, unknown>,
    updateData: Record<string, unknown>,
  ): Promise<void> {
    const auth = this.requireAuth();
    const historyFields = PromocionHistoryRecorder.HISTORY_FIELDS.filter(
      (f) => f.key !== "slug" && f.key !== "draftPayload",
    );
    const historyRepo = new PromocionHistoryRepository(this.ctx);
    await historyRepo.recordFieldChanges(
      tx,
      id,
      current,
      historyFields,
      data,
      updateData,
      auth.userId,
    );
  }
}
