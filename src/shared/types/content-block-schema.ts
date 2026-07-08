import { z } from "zod";
import { CONTENT_BLOCK_TYPES } from "@/shared/constants/db-enums";

/**
 * Schema Zod discriminado por `blockType` para bloques editoriales.
 * Cada tipo de bloque tiene su propio schema de payload.
 */

const descripcionGeneralSchema = z.object({
  blockType: z.literal("DESCRIPCION_GENERAL"),
  payload: z.object({
    text: z.string(),
  }),
});

const memoriaCalidadesSchema = z.object({
  blockType: z.literal("MEMORIA_CALIDADES"),
  payload: z.object({
    items: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string().optional(),
      }),
    ),
  }),
});

const zonasComunesSchema = z.object({
  blockType: z.literal("ZONAS_COMUNES"),
  payload: z.object({
    items: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    ),
  }),
});

const ubicacionServiciosSchema = z.object({
  blockType: z.literal("UBICACION_SERVICIOS"),
  payload: z.object({
    items: z.array(
      z.object({
        service: z.string(),
        distance: z.string(),
      }),
    ),
  }),
});

const plazosGarantiasSchema = z.object({
  blockType: z.literal("PLAZOS_GARANTIAS"),
  payload: z.object({
    delivery: z.string().optional(),
    license: z.string().optional(),
    guarantee: z.string().optional(),
    audit: z.string().optional(),
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
