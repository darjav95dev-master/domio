import { eq, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { contactConfig as contactConfigTable, contentBlocks } from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import type { ContactConfig } from "@/infrastructure/db/schema/contact-config";
import type { ContentBlock } from "@/infrastructure/db/schema/content-blocks";
import type { ContactPageData, SobrePageData } from "@/features/contact/types";
import type { ContactConfigData } from "@/features/contact/types";

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

  return {
    hero: heroBlock
      ? (heroBlock.payload as SobrePageData["hero"])
      : null,
    cuerpo: cuerpoBlock
      ? (cuerpoBlock.payload as SobrePageData["cuerpo"])
      : null,
  };
}
