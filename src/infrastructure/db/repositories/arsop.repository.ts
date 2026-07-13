import { eq, and, sql } from "drizzle-orm";
import {
  leads,
  leadNotes,
  leadHistory,
  consentRecords,
  leadReadMarks,
  arsopRequests,
} from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { MediaService } from "@/infrastructure/media/media.service";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { csvLine } from "@/shared/utils/csv";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArsopRequestRow {
  id: string;
  tenantId: string;
  leadId: string | null;
  requestType: string;
  requestedAt: Date;
  processedBy: string | null;
  processedAt: Date | null;
  resultAssetId: string | null;
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Genera el contenido CSV completo para la exportacion ARSOP de un lead.
 */
function generateExportCsv(
  lead: {
    name: string;
    email: string;
    phone: string | null;
    message: string | null;
    source: string;
    channel: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  },
  notes: Array<{
    id: string;
    body: string;
    authorId: string;
    createdAt: Date;
  }>,
  history: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    authorId: string;
    createdAt: Date;
  }>,
  consents: Array<{
    id: string;
    legalBasis: string;
    textAccepted: string;
    ip: string | null;
    userAgent: string | null;
    createdAt: Date;
  }>,
): string {
  let csv = "";

  // Cabecera general
  csv += csvLine("SECTION", "DATOS_PERSONALES");
  csv += csvLine("campo", "valor");
  csv += csvLine("name", lead.name);
  csv += csvLine("email", lead.email);
  csv += csvLine("phone", lead.phone);
  csv += csvLine("message", lead.message);
  csv += csvLine("source", lead.source);
  csv += csvLine("channel", lead.channel);
  csv += csvLine("status", lead.status);
  csv += csvLine("created_at", lead.createdAt.toISOString());
  csv += csvLine("updated_at", lead.updatedAt.toISOString());
  csv += "\r\n";

  // Notas
  csv += csvLine("SECTION", "NOTAS");
  csv += csvLine("id", "body", "author_id", "created_at");
  for (const note of notes) {
    csv += csvLine(note.id, note.body, note.authorId, note.createdAt.toISOString());
  }
  csv += "\r\n";

  // Historial
  csv += csvLine("SECTION", "HISTORIAL");
  csv += csvLine("id", "from_status", "to_status", "author_id", "created_at");
  for (const entry of history) {
    csv += csvLine(
      entry.id,
      entry.fromStatus ?? "",
      entry.toStatus,
      entry.authorId,
      entry.createdAt.toISOString(),
    );
  }
  csv += "\r\n";

  // Consentimientos
  csv += csvLine("SECTION", "CONSENTIMIENTOS");
  csv += csvLine("id", "legal_basis", "text_accepted", "ip", "user_agent", "created_at");
  for (const consent of consents) {
    csv += csvLine(
      consent.id,
      consent.legalBasis,
      consent.textAccepted,
      consent.ip ?? "",
      consent.userAgent ?? "",
      consent.createdAt.toISOString(),
    );
  }

  return csv;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ArsopRepository extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext;
  private readonly mediaService: MediaService;

  constructor(ctx: AuthenticatedContext, mediaService: MediaService) {
    super(ctx);
    this.authCtx = ctx;
    this.mediaService = mediaService;
  }

  /**
   * Exporta los datos de un lead a CSV, lo sube a R2 via MediaService,
   * y registra la operacion en arsop_requests con request_type='EXPORT'.
   *
   * Toda la operacion ocurre dentro de una transaccion con SET LOCAL.
   */
  async exportLead(
    leadId: string,
    userId: string,
  ): Promise<ArsopRequestRow> {
    return this.withTransaction(async (tx) => {
      // 1. Fetch lead
      const [lead] = await tx
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.id, leadId),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        );

      if (!lead) {
        throw new Error("Lead not found");
      }

      // 2. Fetch related data
      const notes = await tx
        .select()
        .from(leadNotes)
        .where(
          and(
            eq(leadNotes.leadId, leadId),
            eq(leadNotes.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .orderBy(leadNotes.createdAt);

      const history = await tx
        .select()
        .from(leadHistory)
        .where(
          and(
            eq(leadHistory.leadId, leadId),
            eq(leadHistory.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .orderBy(leadHistory.createdAt);

      const consents = await tx
        .select()
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.leadId, leadId),
            eq(consentRecords.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .orderBy(consentRecords.createdAt);

      // 3. Generate CSV
      const csvContent = generateExportCsv(lead, notes, history, consents);
      const csvBuffer = Buffer.from(csvContent, "utf-8");

      // 4. Upload to MediaService (creates R2 object + media_assets record)
      const asset = await this.mediaService.uploadImage({
        file: csvBuffer,
        fileName: `export-${leadId}-${Date.now()}.csv`,
        mimeType: "text/csv",
        altText: `Exportacion ARSOP lead ${leadId}`,
        kind: "DOCUMENT",
        ownerId: leadId,
      });

      // 5. Insert arsop_request
      const [request] = await tx
        .insert(arsopRequests)
        .values({
          tenantId: this.authCtx.getTenantId(),
          leadId,
          requestType: "EXPORT",
          requestedAt: sql`now()`,
          processedBy: userId,
          processedAt: sql`now()`,
          resultAssetId: asset.id,
        })
        .returning();

      if (!request) {
        throw new Error("Failed to insert arsop_request for export");
      }

      return request;
    });
  }

  /**
   * Elimina un lead y todos sus datos asociados en cascada,
   * y registra la operacion en arsop_requests con request_type='DELETE'.
   *
   * Orden de borrado (data-model.md):
   * 1. lead_read_marks
   * 2. lead_notes
   * 3. lead_history
   * 4. consent_records
   * 5. leads
   *
   * Toda la operacion ocurre dentro de una transaccion unica con SET LOCAL.
   */
  async deleteLead(
    leadId: string,
    userId: string,
  ): Promise<ArsopRequestRow> {
    return this.withTransaction(async (tx) => {
      // 1. Verify lead exists
      const [lead] = await tx
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            eq(leads.id, leadId),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        );

      if (!lead) {
        throw new Error("Lead not found");
      }

      // ponytail: insert audit record BEFORE deleting the lead so the FK check passes.
      // lead_id becomes NULL after lead deletion (ON DELETE SET NULL).
      const [request] = await tx
        .insert(arsopRequests)
        .values({
          tenantId: this.authCtx.getTenantId(),
          leadId,
          requestType: "DELETE",
          requestedAt: sql`now()`,
          processedBy: userId,
          processedAt: sql`now()`,
          resultAssetId: null,
        })
        .returning();

      if (!request) {
        throw new Error("Failed to insert arsop_request for delete");
      }

      // 2. Cascade delete in order
      await tx
        .delete(leadReadMarks)
        .where(
          and(
            eq(leadReadMarks.leadId, leadId),
            eq(leadReadMarks.tenantId, this.authCtx.getTenantId()),
          ),
        );

      await tx
        .delete(leadNotes)
        .where(
          and(
            eq(leadNotes.leadId, leadId),
            eq(leadNotes.tenantId, this.authCtx.getTenantId()),
          ),
        );

      await tx
        .delete(leadHistory)
        .where(
          and(
            eq(leadHistory.leadId, leadId),
            eq(leadHistory.tenantId, this.authCtx.getTenantId()),
          ),
        );

      await tx
        .delete(consentRecords)
        .where(
          and(
            eq(consentRecords.leadId, leadId),
            eq(consentRecords.tenantId, this.authCtx.getTenantId()),
          ),
        );

      await tx
        .delete(leads)
        .where(
          and(
            eq(leads.id, leadId),
            eq(leads.tenantId, this.authCtx.getTenantId()),
          ),
        );

      return request;
    });
  }
}
