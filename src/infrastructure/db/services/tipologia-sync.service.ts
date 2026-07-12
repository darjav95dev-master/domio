import { eq, and } from "drizzle-orm";
import { tipologias, unidades } from "@/infrastructure/db/schema";
import type { TenantContext, Transaction } from "@/infrastructure/tenant/TenantContext";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { TipologiaRepository } from "@/infrastructure/db/repositories/tipologia.repository";
import { UnidadRepository } from "@/infrastructure/db/repositories/unidad.repository";
import type { TipologiaPayloadFull as TipologiaPayload, UnidadPayload } from "@/shared/types/tipologia-schema";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Handles synchronization of tipologías (and nested unidades) for a promoción.
 *
 * Extracted from PromocionRepository to respect SRP — this logic changes when
 * the tipología schema or validation rules change, independently of the
 * promoción CRUD operations.
 */
export class TipologiaSyncService {
  private readonly tipologiaRepo: TipologiaRepository;
  private readonly unidadRepo: UnidadRepository;

  constructor(
    private readonly ctx: TenantContext,
    authCtx: AuthenticatedContext,
  ) {
    this.tipologiaRepo = new TipologiaRepository(authCtx);
    this.unidadRepo = new UnidadRepository(authCtx);
  }

  /**
   * Synchronizes tipologías (and nested unidades) for a promoción.
   *
   * Creates new tipologías (no `id`), updates existing ones (has `id`),
   * and deletes tipologías present in DB but absent from the payload.
   * Unidades within each tipología follow the same create/update/delete
   * pattern. All operations run within the given transaction.
   */
  async syncInTx(
    tx: Transaction,
    promocionId: string,
    tipologiasPayload: TipologiaPayload[],
  ): Promise<void> {
    // Fetch existing tipologías for this promoción
    const existingTipologiasRows = await tx
      .select({ id: tipologias.id })
      .from(tipologias)
      .where(
        and(
          eq(tipologias.promocionId, promocionId),
          eq(tipologias.tenantId, this.ctx.getTenantId()),
        ),
      );

    const existingIds = new Set(existingTipologiasRows.map((t) => t.id));
    const payloadIds = new Set(
      tipologiasPayload.filter((t) => t.id).map((t) => t.id as string),
    );

    // Delete tipologías not in the payload (cascades to unidades)
    for (const existing of existingTipologiasRows) {
      if (!payloadIds.has(existing.id)) {
        await this.tipologiaRepo.deleteWithTx(tx, existing.id);
      }
    }

    // Process each tipología in the payload
    for (const tipologiaPayload of tipologiasPayload) {
      if (tipologiaPayload.id && existingIds.has(tipologiaPayload.id)) {
        await this.updateOneTipologiaInTx(tx, tipologiaPayload);
      } else {
        await this.createOneTipologiaInTx(tx, promocionId, tipologiaPayload);
      }
    }
  }

  /** Builds a TipologiaUpdateData from a TipologiaPayload. */
  private buildTipologiaUpdate(
    payload: TipologiaPayload,
  ): Parameters<TipologiaRepository["updateWithTx"]>[2] {
    return {
      name: payload.name,
      usefulArea: payload.usefulArea ?? null,
      builtArea: payload.builtArea ?? null,
      floors: payload.floors ?? null,
      bedrooms: payload.bedrooms ?? null,
      bathrooms: payload.bathrooms ?? null,
      yearBuilt: payload.yearBuilt ?? null,
      energyCert: payload.energyCert ?? null,
      referencePriceSale: payload.referencePriceSale ?? null,
      referencePriceRent: payload.referencePriceRent ?? null,
      communityFee: payload.communityFee ?? null,
      deposit: payload.deposit ?? null,
      amenities: payload.amenities,
      planAssetId: payload.planAssetId ?? null,
    };
  }

  /** Builds a TipologiaCreateData from a TipologiaPayload + promocionId. */
  private buildTipologiaCreate(
    promocionId: string,
    payload: TipologiaPayload,
  ): Parameters<TipologiaRepository["createWithTx"]>[1] {
    return {
      promocionId,
      name: payload.name,
      usefulArea: payload.usefulArea ?? null,
      builtArea: payload.builtArea ?? null,
      floors: payload.floors ?? null,
      bedrooms: payload.bedrooms ?? null,
      bathrooms: payload.bathrooms ?? null,
      yearBuilt: payload.yearBuilt ?? null,
      energyCert: payload.energyCert ?? null,
      referencePriceSale: payload.referencePriceSale ?? null,
      referencePriceRent: payload.referencePriceRent ?? null,
      communityFee: payload.communityFee ?? null,
      deposit: payload.deposit ?? null,
      amenities: payload.amenities,
      planAssetId: payload.planAssetId ?? null,
    };
  }

  /** Updates an existing tipología and syncs its unidades. */
  private async updateOneTipologiaInTx(
    tx: Transaction,
    payload: TipologiaPayload,
  ): Promise<void> {
    await this.tipologiaRepo.updateWithTx(tx, payload.id!, this.buildTipologiaUpdate(payload));

    if (payload.unidades !== undefined) {
      await this.syncUnidadesInTx(tx, payload.id!, payload.unidades);
    }
  }

  /** Creates a new tipología and its unidades. */
  private async createOneTipologiaInTx(
    tx: Transaction,
    promocionId: string,
    payload: TipologiaPayload,
  ): Promise<void> {
    const created = await this.tipologiaRepo.createWithTx(
      tx, this.buildTipologiaCreate(promocionId, payload),
    );

    if (payload.unidades === undefined) return;

    for (const unidadPayload of payload.unidades) {
      await this.unidadRepo.createWithTx(tx, {
        tipologiaId: created.id,
        identifier: unidadPayload.identifier ?? null,
        status: unidadPayload.status,
      });
    }
  }

  /**
   * Synchronizes unidades within a tipología.
   * Creates new (no `id`), updates existing (has `id`),
   * and deletes unidades present in DB but absent from the payload.
   */
  private async syncUnidadesInTx(
    tx: Transaction,
    tipologiaId: string,
    unidadesPayload: UnidadPayload[],
  ): Promise<void> {
    // Fetch existing unidades for this tipología
    const existingUnidadRows = await tx
      .select({ id: unidades.id })
      .from(unidades)
      .where(
        and(
          eq(unidades.tipologiaId, tipologiaId),
          eq(unidades.tenantId, this.ctx.getTenantId()),
        ),
      );

    const existingUnidadIds = new Set(existingUnidadRows.map((u) => u.id));
    const payloadUnidadIds = new Set(
      unidadesPayload.filter((u) => u.id).map((u) => u.id as string),
    );

    // Delete unidades not in the payload
    for (const existing of existingUnidadRows) {
      if (!payloadUnidadIds.has(existing.id)) {
        await this.unidadRepo.deleteWithTx(tx, existing.id);
      }
    }

    // Create or update each unidad
    for (const unidadPayload of unidadesPayload) {
      if (unidadPayload.id && existingUnidadIds.has(unidadPayload.id)) {
        await this.unidadRepo.updateWithTx(tx, unidadPayload.id, {
          identifier: unidadPayload.identifier ?? null,
          status: unidadPayload.status,
        });
      } else {
        await this.unidadRepo.createWithTx(tx, {
          tipologiaId,
          identifier: unidadPayload.identifier ?? null,
          status: unidadPayload.status,
        });
      }
    }
  }
}
