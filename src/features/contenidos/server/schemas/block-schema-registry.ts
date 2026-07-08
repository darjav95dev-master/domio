import { z } from "zod";
import type { PageKey, BlockKey } from "@/shared/types/content.types";
import * as schemas from "./content-block.schema";

const registry: Record<string, z.ZodSchema> = {
  "home:hero": schemas.heroBlockSchema,
  "home:como-trabajamos": schemas.comoTrabajamosBlockSchema,
  "home:sobre": schemas.sobreHomeBlockSchema,
  "home:portafolio-destacado": schemas.portafolioDestacadoBlockSchema,
  "home:confianza": schemas.confianzaBlockSchema,
  "home:cta-final": schemas.ctaFinalBlockSchema,
  "home:faq": schemas.faqBlockSchema,
  "sobre:hero": schemas.sobreHeroBlockSchema,
  "sobre:cuerpo": schemas.sobreCuerpoBlockSchema,
  "equipo:hero": schemas.equipoHeroBlockSchema,
  "equipo:miembros": schemas.equipoMiembrosBlockSchema,
  "aviso-legal:contenido": schemas.legalContentBlockSchema,
  "privacidad:contenido": schemas.legalContentBlockSchema,
  "cookies:contenido": schemas.legalContentBlockSchema,
};

/**
 * Returns the Zod schema for a given page_key + block_key combination,
 * or null if no schema is registered for that combination.
 */
export function getBlockSchema(
  pageKey: PageKey,
  blockKey: BlockKey,
): z.ZodSchema | null {
  return registry[`${pageKey}:${blockKey}`] ?? null;
}

/**
 * Returns true if a valid schema exists for the given page_key + block_key.
 */
export function isValidBlockKey(pageKey: PageKey, blockKey: BlockKey): boolean {
  return `${pageKey}:${blockKey}` in registry;
}
