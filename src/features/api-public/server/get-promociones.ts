import { ApiKeyContext } from "@/infrastructure/tenant/ApiKeyContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import type { ApiCursorOptions, ApiCursorResult } from "@/infrastructure/db/repositories/promocion.repository";

const DEFAULT_API_LIMIT = 20;
const MAX_API_LIMIT = 100;

export interface GetPromocionesInput {
  ctx: ApiKeyContext;
  cursor?: string;
  limit?: number;
}

/**
 * Retrieves the list of promociones for the API pública v1.
 *
 * Applies mandatory filters:
 * - kind = 'portfolio' (enforced by ApiKeyContext)
 * - status = 'PUBLISHED' (enforced by ApiKeyContext)
 *
 * Uses cursor pagination based on updated_at DESC, id DESC.
 *
 * @param input.ctx - The ApiKeyContext resolved from the API key.
 * @param input.cursor - Optional cursor for pagination (base64url-encoded "updatedAt|id").
 * @param input.limit - Optional limit (default 20, max 100).
 * @returns Paginated promociones with nextCursor for further pages.
 */
export async function getPromociones(
  input: GetPromocionesInput,
): Promise<ApiCursorResult> {
  const { ctx, cursor, limit } = input;
  const clampedLimit = Math.min(Math.max(1, limit ?? DEFAULT_API_LIMIT), MAX_API_LIMIT);

  const repository = new PromocionRepository(ctx);
  const options: ApiCursorOptions = { limit: clampedLimit };

  if (cursor) {
    options.cursor = cursor;
  }

  return repository.findForApiCursor(options);
}
