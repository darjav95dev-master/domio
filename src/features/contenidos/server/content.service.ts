import { revalidateTag } from "next/cache";
import type { ContentBlockRepository } from "./content-block.repository";
import type { ContactConfigRepository, ContactConfigUpdateData } from "./contact-config.repository";
import type { ContentHistoryRepository } from "./content-history.repository";
import { getBlockSchema, isValidBlockKey } from "./schemas/block-schema-registry";
import { contactConfigSchema } from "./schemas/contact-config.schema";
import type { PageKey, BlockKey } from "@/shared/types/content.types";

export interface SaveBlockResult {
  success: boolean;
  error?: string;
  details?: unknown;
}

export class ContentService {
  constructor(
    private blockRepo: ContentBlockRepository,
    private contactRepo: ContactConfigRepository,
    private historyRepo: ContentHistoryRepository,
  ) {}

  async saveBlock(
    tenantId: string,
    pageKey: PageKey,
    blockKey: BlockKey,
    payload: Record<string, unknown>,
    userId: string,
  ): Promise<SaveBlockResult> {
    // 1. Validar que la combinación page_key+block_key es válida
    if (!isValidBlockKey(pageKey, blockKey)) {
      return { success: false, error: "Combinación page_key+block_key no válida" };
    }

    // 2. Validar payload con schema Zod específico
    const schema = getBlockSchema(pageKey, blockKey);
    if (!schema) {
      return { success: false, error: "Schema no encontrado para este bloque" };
    }

    const validation = schema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: "Payload inválido",
        details: validation.error.issues,
      };
    }

    // 3. Upsert en content_blocks
    await this.blockRepo.upsert(tenantId, pageKey, blockKey, payload, userId);

    // 4. Crear entrada en content_history
    await this.historyRepo.create(
      tenantId,
      "block",
      `${pageKey}:${blockKey}`,
      payload,
      userId,
    );

    // 5. Disparar revalidateTag
    revalidateTag(`content:${pageKey}`);

    return { success: true };
  }

  async saveContactConfig(
    tenantId: string,
    data: ContactConfigUpdateData,
    userId: string,
  ): Promise<SaveBlockResult> {
    // 1. Validar con schema Zod
    const validation = contactConfigSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: "Payload inválido",
        details: validation.error.issues,
      };
    }

    // 2. Upsert en contact_config
    await this.contactRepo.upsert(tenantId, validation.data, userId);

    // 3. Crear entrada en content_history
    await this.historyRepo.create(
      tenantId,
      "contact",
      "global",
      validation.data as Record<string, unknown>,
      userId,
    );

    // 4. Disparar revalidateTag
    revalidateTag("contact:global");
    revalidateTag("layout:public");

    return { success: true };
  }

  async revert(
    tenantId: string,
    historyId: string,
    userId: string,
  ): Promise<SaveBlockResult> {
    // 1. Obtener entrada histórica
    const historyEntry = await this.historyRepo.findById(tenantId, historyId);
    if (!historyEntry) {
      return { success: false, error: "Entrada histórica no encontrada" };
    }

    // 2. Según content_type, actualizar content_blocks o contact_config
    if (historyEntry.contentType === "block") {
      // content_key tiene formato "pageKey:blockKey"
      const [pageKey, blockKey] = historyEntry.contentKey.split(":") as [PageKey, BlockKey];
      const snapshot = historyEntry.payloadSnapshot ?? {};
      await this.blockRepo.upsert(
        tenantId,
        pageKey,
        blockKey,
        snapshot,
        userId,
      );

      // Crear nueva entrada en historial (el revert también se registra)
      await this.historyRepo.create(
        tenantId,
        "block",
        historyEntry.contentKey,
        snapshot,
        userId,
      );

      revalidateTag(`content:${pageKey}`);
    } else {
      // contentType === "contact"
      const snapshot = historyEntry.payloadSnapshot ?? {};
      await this.contactRepo.upsert(
        tenantId,
        snapshot as ContactConfigUpdateData,
        userId,
      );

      await this.historyRepo.create(
        tenantId,
        "contact",
        "global",
        snapshot,
        userId,
      );

      revalidateTag("contact:global");
      revalidateTag("layout:public");
    }

    return { success: true };
  }
}
