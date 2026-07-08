import { eq, and } from "drizzle-orm";
import { tipologias } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { Transaction } from "@/infrastructure/tenant/TenantContext";

export interface TipologiaCreateData {
  promocionId: string;
  name: string;
  usefulArea?: number | null;
  builtArea?: number | null;
  floors?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  energyCert?: string | null;
  referencePriceSale?: number | null;
  referencePriceRent?: number | null;
  communityFee?: number | null;
  deposit?: number | null;
  amenities?: string[];
  planAssetId?: string | null;
}

export interface TipologiaUpdateData {
  name?: string;
  usefulArea?: number | null;
  builtArea?: number | null;
  floors?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  energyCert?: string | null;
  referencePriceSale?: number | null;
  referencePriceRent?: number | null;
  communityFee?: number | null;
  deposit?: number | null;
  amenities?: string[];
  planAssetId?: string | null;
}

type TipologiaRow = typeof tipologias.$inferSelect;

export class TipologiaRepository extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext;

  constructor(ctx: AuthenticatedContext) {
    super(ctx);
    this.authCtx = ctx;
  }

  async findByPromocionIdWithTx(
    tx: Transaction,
    promocionId: string,
  ): Promise<TipologiaRow[]> {
    const rows = await tx
      .select()
      .from(tipologias)
      .where(
        and(
          eq(tipologias.promocionId, promocionId),
          eq(tipologias.tenantId, this.authCtx.getTenantId()),
        ),
      );

    return rows;
  }

  async findByPromocionId(promocionId: string): Promise<TipologiaRow[]> {
    return this.withTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(tipologias)
        .where(
          and(
            eq(tipologias.promocionId, promocionId),
            eq(tipologias.tenantId, this.authCtx.getTenantId()),
          ),
        );

      return rows;
    });
  }

  async create(data: TipologiaCreateData): Promise<TipologiaRow> {
    return this.withTransaction(async (tx) => {
      return this.createWithTx(tx, data);
    });
  }

  async createWithTx(
    tx: Transaction,
    data: TipologiaCreateData,
  ): Promise<TipologiaRow> {
    const [row] = await tx
      .insert(tipologias)
      .values({
        tenantId: this.authCtx.getTenantId(),
        promocionId: data.promocionId,
        name: data.name,
        usefulArea: data.usefulArea ?? null,
        builtArea: data.builtArea ?? null,
        floors: data.floors ?? null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        yearBuilt: data.yearBuilt ?? null,
        energyCert: (data.energyCert ?? null) as TipologiaRow["energyCert"],
        referencePriceSale: data.referencePriceSale ?? null,
        referencePriceRent: data.referencePriceRent ?? null,
        communityFee: data.communityFee ?? null,
        deposit: data.deposit ?? null,
        amenities: data.amenities ?? [],
        planAssetId: data.planAssetId ?? null,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create tipología");
    }

    return row;
  }

  async update(
    id: string,
    data: TipologiaUpdateData,
  ): Promise<TipologiaRow> {
    return this.withTransaction(async (tx) => {
      return this.updateWithTx(tx, id, data);
    });
  }

  async updateWithTx(
    tx: Transaction,
    id: string,
    data: TipologiaUpdateData,
  ): Promise<TipologiaRow> {
    const updateData: Record<string, unknown> = {};
    const fields = [
      "name",
      "usefulArea",
      "builtArea",
      "floors",
      "bedrooms",
      "bathrooms",
      "yearBuilt",
      "energyCert",
      "referencePriceSale",
      "referencePriceRent",
      "communityFee",
      "deposit",
      "amenities",
      "planAssetId",
    ] as const;

    for (const field of fields) {
      if (field in data) {
        updateData[field] = (data as Record<string, unknown>)[field];
      }
    }

    const [updated] = await tx
      .update(tipologias)
      .set(updateData as Partial<typeof tipologias.$inferInsert>)
      .where(
        and(
          eq(tipologias.id, id),
          eq(tipologias.tenantId, this.authCtx.getTenantId()),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error(`Tipología with id ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<TipologiaRow> {
    return this.withTransaction(async (tx) => {
      return this.deleteWithTx(tx, id);
    });
  }

  async deleteWithTx(tx: Transaction, id: string): Promise<TipologiaRow> {
    const [deleted] = await tx
      .delete(tipologias)
      .where(
        and(
          eq(tipologias.id, id),
          eq(tipologias.tenantId, this.authCtx.getTenantId()),
        ),
      )
      .returning();

    if (!deleted) {
      throw new Error(`Tipología with id ${id} not found`);
    }

    return deleted;
  }
}
