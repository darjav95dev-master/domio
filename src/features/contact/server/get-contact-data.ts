import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { contactConfig as contactConfigTable, contentBlocks } from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import type { ContactConfig } from "@/infrastructure/db/schema/contact-config";
import type { ContentBlock } from "@/infrastructure/db/schema/content-blocks";
import type { ContactPageData, SobrePageData } from "@/features/contact/types";
import type { ContactConfigData } from "@/features/contact/types";

// ── Zod schemas for content block payloads ──────────────────────────────────
// architecture.md §7.6: content editorial siempre validado por Zod

const aboutHeroSchema = z.object({
  titulo: z.string(),
  lead: z.string(),
});

const aboutCuerpoSchema = z.object({
  parrafos: z.array(z.string()),
});

/**
 * Fetches contact configuration for the public tenant.
 */
async function fetchContactConfig(): Promise<ContactConfig | null> {
  const ctx = new PublicContext();
  const tenantId = ctx.getTenantId();

  return ctx.withTransaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(contactConfigTable)
      .where(eq(contactConfigTable.tenantId, tenantId))
      .limit(1);

    return row ?? null;
  });
}

/**
 * Fetches content blocks for a given page key from the public tenant.
 */
async function fetchContentBlocks(pageKey: string): Promise<ContentBlock[]> {
  const ctx = new PublicContext();
  const tenantId = ctx.getTenantId();

  return ctx.withTransaction(async (tx) => {
    return tx
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.tenantId, tenantId),
          eq(contentBlocks.pageKey, pageKey),
        ),
      );
  });
}

/**
 * Builds a block map from a content block array, keyed by blockKey.
 */
function buildBlockMap(
  blocks: ContentBlock[],
): Map<string, ContentBlock> {
  const map = new Map<string, ContentBlock>();
  for (const block of blocks) {
    map.set(block.blockKey, block);
  }
  return map;
}

// ── Cached fetchers ────────────────────────────────────────────────────────

const getCachedContactConfig = unstable_cache(
  fetchContactConfig,
  ["contact-config"],
  { revalidate: 3600, tags: ["contact:global"] },
);

const getCachedContentBlocks = unstable_cache(
  async (pageKey: string) => fetchContentBlocks(pageKey),
  ["content-blocks"],
  { revalidate: 3600, tags: ["content:global"] },
);

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns all data needed by the /contacto page.
 */
export async function getContactPageData(): Promise<ContactPageData> {
  const contactConfig = await getCachedContactConfig();

  return {
    contactConfig: contactConfig
      ? ({
          phone: contactConfig.phone,
          email: contactConfig.email,
          address: contactConfig.address,
          hours: contactConfig.hours,
          whatsappNumber: contactConfig.whatsappNumber,
          whatsappPrefilledMessage: contactConfig.whatsappPrefilledMessage,
          officeLat: contactConfig.officeLat ?? null,
          officeLng: contactConfig.officeLng ?? null,
        } satisfies ContactConfigData)
      : null,
  };
}

/**
 * Returns all data needed by the /sobre page.
 */
export async function getSobrePageData(): Promise<SobrePageData> {
  const blocks = await getCachedContentBlocks("sobre");
  const blockMap = buildBlockMap(blocks);

  const heroBlock = blockMap.get("hero");
  const cuerpoBlock = blockMap.get("cuerpo");

  // Validate payloads with Zod per architecture.md §7.6
  // Return null for blocks with invalid payload — the page degrades gracefully
  const hero = heroBlock
    ? parsePayloadSafely(heroBlock.payload, aboutHeroSchema)
    : null;
  const cuerpo = cuerpoBlock
    ? parsePayloadSafely(cuerpoBlock.payload, aboutCuerpoSchema)
    : null;

  return { hero, cuerpo };
}

/**
 * Safely parses a raw payload against a Zod schema.
 * Returns the parsed value if valid, or null if invalid.
 */
function parsePayloadSafely<T>(payload: unknown, schema: z.ZodSchema<T>): T | null {
  const result = schema.safeParse(payload);
  return result.success ? result.data : null;
}
