import { z } from "zod";
import { CONTENT_BLOCK_TYPES } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Allowed HTML tags for DESCRIPCION_GENERAL
// ---------------------------------------------------------------------------
const ALLOWED_HTML_TAGS_SET = new Set([
  "b", "i", "u", "p", "br", "ul", "ol", "li",
  "strong", "em", "span", "div", "h1", "h2", "h3",
  "h4", "h5", "h6", "blockquote", "a", "hr",
]);

const REQ_FIELD_MSG = "Este campo no puede estar vacío";
const MIN_ITEMS_MSG = "Debe incluir al menos un elemento";

/**
 * Extracts all HTML tag names from a string and verifies they are in the
 * allowed set. Returns true if all tags are allowed.
 */
function validateAllowedHtml(value: string): boolean {
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(value)) !== null) {
    const tagName = match[1]!.toLowerCase();
    if (!ALLOWED_HTML_TAGS_SET.has(tagName)) {
      return false;
    }
  }

  return true;
}

const htmlSafeString = () =>
  z
    .string()
    .min(1, REQ_FIELD_MSG)
    .refine(validateAllowedHtml, {
      message: "El texto contiene etiquetas HTML no permitidas",
    });

const nonEmptyString = () => z.string().min(1, REQ_FIELD_MSG);

// ---------------------------------------------------------------------------
// Schema per block type
// ---------------------------------------------------------------------------

const descripcionGeneralSchema = z.object({
  blockType: z.literal("DESCRIPCION_GENERAL"),
  payload: z.object({
    text: htmlSafeString(),
  }),
});

const memoriaCalidadesSchema = z.object({
  blockType: z.literal("MEMORIA_CALIDADES"),
  payload: z.object({
    items: z
      .array(
        z.object({
          title: nonEmptyString(),
          description: nonEmptyString(),
          icon: nonEmptyString().optional(),
        }),
      )
      .min(1, MIN_ITEMS_MSG),
  }),
});

const zonasComunesSchema = z.object({
  blockType: z.literal("ZONAS_COMUNES"),
  payload: z.object({
    items: z
      .array(
        z.object({
          name: nonEmptyString(),
          description: nonEmptyString(),
        }),
      )
      .min(1, MIN_ITEMS_MSG),
  }),
});

const ubicacionServiciosSchema = z.object({
  blockType: z.literal("UBICACION_SERVICIOS"),
  payload: z.object({
    items: z
      .array(
        z.object({
          service: nonEmptyString(),
          distance: nonEmptyString(),
        }),
      )
      .min(1, MIN_ITEMS_MSG),
  }),
});

const plazosGarantiasSchema = z.object({
  blockType: z.literal("PLAZOS_GARANTIAS"),
  payload: z.object({
    delivery: nonEmptyString().optional(),
    license: nonEmptyString().optional(),
    guarantee: nonEmptyString().optional(),
    audit: nonEmptyString().optional(),
  }),
});

/**
 * Schema discriminado por `blockType`.
 * Usa `z.discriminatedUnion` para validar eficientemente por el campo discriminador.
 */
export const contentBlockSchema = z.discriminatedUnion("blockType", [
  descripcionGeneralSchema,
  memoriaCalidadesSchema,
  zonasComunesSchema,
  ubicacionServiciosSchema,
  plazosGarantiasSchema,
]);

export type ContentBlockPayload = z.infer<typeof contentBlockSchema>;

/** Tipo auxiliar para los valores válidos de blockType. */
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];
