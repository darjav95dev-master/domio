import { eq, and } from "drizzle-orm";
import { unidades } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { Transaction } from "@/infrastructure/tenant/TenantContext";

export interface UnidadCreateData {
  tipologiaId: string;
  identifier?: string | null;
  status?: string;
}

export interface UnidadUpdateData {
  identifier?: string | null;
  status?: string;
}

type UnidadRow = typeof unidades.$inferSelect;

export class UnidadRepository extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext;

  constructor(ctx: AuthenticatedContext) {
    super(ctx);
    this.authCtx = ctx;
  }

  async findByTipologiaId(tipologiaId: string): Promise<UnidadRow[]> {
    return this.withTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(unidades)
        .where(
          and(
            eq(unidades.tipologiaId, tipologiaId),
            eq(unidades.tenantId, this.authCtx.getTenantId()),
          ),
        );

      return rows;
    });
  }

  async create(data: UnidadCreateData): Promise<UnidadRow> {
    return this.withTransaction(async (tx) => {
      return this.createWithTx(tx, data);
    });
  }

  async createWithTx(
    tx: Transaction,
    data: UnidadCreateData,
  ): Promise<UnidadRow> {
    const [row] = await tx
      .insert(unidades)
      .values({
        tenantId: this.authCtx.getTenantId(),
        tipologiaId: data.tipologiaId,
        identifier: data.identifier ?? null,
        status: (data.status ?? "AVAILABLE") as UnidadRow["status"],
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create unidad");
    }

    return row;
  }

  async update(
    id: string,
    data: UnidadUpdateData,
  ): Promise<UnidadRow> {
    return this.withTransaction(async (tx) => {
      return this.updateWithTx(tx, id, data);
    });
  }

  async updateWithTx(
    tx: Transaction,
    id: string,
    data: UnidadUpdateData,
  ): Promise<UnidadRow> {
    const updateData: Record<string, unknown> = {};

    if ("identifier" in data) {
      updateData.identifier = data.identifier ?? null;
    }
    if ("status" in data) {
      updateData.status = data.status;
    }

    const [updated] = await tx
      .update(unidades)
      .set(updateData as Partial<typeof unidades.$inferInsert>)
      .where(
        and(
          eq(unidades.id, id),
          eq(unidades.tenantId, this.authCtx.getTenantId()),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error(`Unidad with id ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<UnidadRow> {
    return this.withTransaction(async (tx) => {
      return this.deleteWithTx(tx, id);
    });
  }

  async deleteWithTx(tx: Transaction, id: string): Promise<UnidadRow> {
    const [deleted] = await tx
      .delete(unidades)
      .where(
        and(
          eq(unidades.id, id),
          eq(unidades.tenantId, this.authCtx.getTenantId()),
        ),
      )
      .returning();

    if (!deleted) {
      throw new Error(`Unidad with id ${id} not found`);
    }

    return deleted;
  }
}
