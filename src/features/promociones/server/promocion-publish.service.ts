import { generateSlug } from "@/infrastructure/slug/generate-slug";
import { validateMediaForPublish } from "@/features/promociones/actions/media.actions";
import type { PromocionRepository, PromocionWithRelations } from "@/infrastructure/db/repositories/promocion.repository";
import type { PromocionContentBlockRepository } from "@/infrastructure/db/repositories/promocion-content-block.repository";
import type { PromocionUpdatePayload } from "@/shared/schemas/promocion.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockValidationError {
  blockId: string;
  blockType: string;
  issues: string[];
}

export interface PublishValidationResult {
  valid: boolean;
  blockErrors: BlockValidationError[] | null;
  mediaErrors: string[] | null;
}

export interface PreparedUpdateData {
  data: Record<string, unknown>;
  resultingSlug: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the last 4 characters of a UUID to use as short identifier in the slug.
 */
function shortId(id: string): string {
  return id.slice(-4);
}

/**
 * Gets the number of bedrooms from the first tipologia, or 0 if none exist
 * (which produces "estudio" in the slug).
 */
function getFirstTipologiaBedrooms(
  tipologias: Array<{ bedrooms: number | null }>,
): number {
  if (tipologias.length === 0) return 0;
  return tipologias[0]?.bedrooms ?? 0;
}

/** Converts a { lng, lat } object (or null) to a PostGIS [lng, lat] tuple. */
function toLngLatTuple(
  loc: { lng: number; lat: number } | null,
): [number, number] | null {
  return loc === null ? null : [loc.lng, loc.lat];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Encapsulates the business logic for publishing a promoción.
 *
 * Separated from the HTTP route handler so each step is testable independently:
 * slug generation, draft merge, block validation, media validation.
 */
export class PromocionPublishService {
  constructor(
    private readonly repository: PromocionRepository,
    private readonly contentBlockRepo: PromocionContentBlockRepository,
  ) {}

  /**
   * Prepares the update data for publishing:
   *   - Merges draftPayload if publishing from draft
   *   - Generates slug if publishing for the first time
   *   - Determines the resulting slug for ISR revalidation
   */
  prepareUpdateData(
    parsedData: PromocionUpdatePayload,
    current: PromocionWithRelations,
    id: string,
    isPublishing: boolean,
  ): PreparedUpdateData {
    const updateData: Record<string, unknown> = {
      ...parsedData,
    };

    // If publishing from draft, merge draftPayload fields
    if (isPublishing && current.draftPayload) {
      for (const [key, value] of Object.entries(current.draftPayload)) {
        if (!(key in updateData)) {
          updateData[key] = value;
        }
      }
      updateData.draftPayload = null;
    }

    // Generate slug if publishing for the first time
    let newSlug: string | null = null;
    if (isPublishing && !current.slug) {
      const propertyType =
        (updateData.propertyType as string) ?? current.propertyType ?? "";
      const operation =
        (updateData.operation as string) ?? current.operation ?? "";
      const municipality =
        (updateData.municipality as string) ?? current.municipality ?? "";
      const bedrooms = getFirstTipologiaBedrooms(current.tipologias);
      const slugId = shortId(id);

      newSlug = generateSlug(
        propertyType,
        operation,
        municipality,
        bedrooms,
        slugId,
      );

      updateData.slug = newSlug;
    }

    // Determine the resulting slug (after update) for revalidation
    const resultingSlug = newSlug ?? current.slug;

    return { data: updateData, resultingSlug };
  }

  /**
   * Rewrites `location` / `locationApprox` on the update payload in place,
   * converting { lng, lat } objects to PostGIS [lng, lat] tuples.
   * Only touches fields that are present.
   */
  convertLocationFields(data: Record<string, unknown>): void {
    if (data.location !== undefined) {
      data.location = toLngLatTuple(data.location as { lng: number; lat: number } | null);
    }
    if (data.locationApprox !== undefined) {
      data.locationApprox = toLngLatTuple(
        data.locationApprox as { lng: number; lat: number } | null,
      );
    }
  }

  /**
   * Validates that all content blocks have valid payloads for publishing.
   * Returns null if valid, or an array of block errors if invalid.
   */
  async validateBlocksOnPublish(
    promocionId: string,
    isPublishing: boolean,
  ): Promise<BlockValidationError[] | null> {
    if (!isPublishing) return null;

    const blockValidation = await this.contentBlockRepo.validateBlocksForPublish(promocionId);

    if (blockValidation.valid) return null;

    return blockValidation.errors.map((e) => ({
      blockId: e.blockId,
      blockType: e.blockType,
      issues: e.issues,
    }));
  }

  /**
   * Validates that media assets are valid for publishing
   * (at least one gallery image, all images have alt_text).
   * Returns null if valid, or an array of media errors if invalid.
   */
  async validateMediaOnPublish(
    promocionId: string,
    isPublishing: boolean,
  ): Promise<string[] | null> {
    if (!isPublishing) return null;

    const mediaValidation = await validateMediaForPublish(promocionId);

    if (mediaValidation.valid) return null;

    return mediaValidation.errors;
  }
}
