import { and, eq } from "drizzle-orm";
import { contentBlocks } from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";

export interface LegalSection {
  titulo: string;
  contenido: string;
}

export interface LegalPayload {
  titulo: string;
  secciones: LegalSection[];
}

const LEGAL_SLUGS = ["aviso-legal", "privacidad", "cookies"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

/**
 * Fetches the seeded legal content block for a given slug
 * (aviso-legal / privacidad / cookies). Returns null when not seeded.
 */
export async function getLegalPage(slug: LegalSlug): Promise<LegalPayload | null> {
  const ctx = new PublicContext();
  const tenantId = ctx.getTenantId();

  const rows = await ctx.withTransaction(async (tx) =>
    tx
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.tenantId, tenantId),
          eq(contentBlocks.pageKey, slug),
          eq(contentBlocks.blockKey, "contenido"),
        ),
      )
      .limit(1),
  );

  const block = rows[0];
  if (!block?.payload) return null;
  return block.payload as unknown as LegalPayload;
}
