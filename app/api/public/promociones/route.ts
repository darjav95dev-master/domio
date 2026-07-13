import type { NextRequest } from "next/server";
import { z } from "zod";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import { CatalogRepository } from "@/infrastructure/db/repositories/catalog.repository";
import { getPublicMediaUrl } from "@/infrastructure/media/public-url";

// Max number of IDs accepted per request — guards against large IN() queries.
const MAX_IDS = 50;

const idsSchema = z
  .string()
  .uuid()
  .array()
  .min(1)
  .max(MAX_IDS);

/**
 * GET /api/public/promociones?ids=uuid1,uuid2,...
 *
 * Returns published portfolio promociones matching the given IDs.
 * Used by the favorites client-side flow: the browser reads IDs from
 * localStorage and fetches only the needed records.
 *
 * No authentication required — only PUBLISHED portfolio items are returned.
 * Max 50 IDs per request.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const rawIds = url.searchParams.get("ids");

  if (!rawIds) {
    return Response.json(
      { error: "Missing required parameter: ids" },
      { status: 400 },
    );
  }

  const ids = rawIds.split(",").map((id) => id.trim()).filter(Boolean);

  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid ids parameter",
        details: parsed.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  try {
    const ctx = new PublicContext();
    const repo = new CatalogRepository(ctx);
    const items = await repo.findPublicByIds(parsed.data);

    const response = items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      kind: item.kind,
      status: item.status,
      operation: item.operation,
      propertyType: item.propertyType,
      constructionStatus: item.constructionStatus,
      island: item.island,
      municipality: item.municipality,
      address: item.address,
      location: item.location,
      locationApprox: item.locationApprox,
      mapPrivacyMode: item.mapPrivacyMode,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      assignedAgentId: item.assignedAgentId,
      assignedAgentName: item.assignedAgentName,
      imageUrl: item.coverR2Key ? getPublicMediaUrl(item.coverR2Key) : null,
      price: item.priceFrom,
      currency: "EUR",
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return Response.json({ items: response }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
