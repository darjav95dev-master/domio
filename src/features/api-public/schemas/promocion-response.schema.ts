import { z } from "zod";
import { MAP_PRIVACY_MODES } from "@/shared/constants/db-enums";

/**
 * Schema Zod para la respuesta de una promoción en la API pública v1.
 *
 * Define la estructura exacta del JSON que retorna GET /api/v1/promociones.
 * El serializador garantiza que si map_privacy_mode='AREA', el campo
 * location se omite.
 */
export const promocionResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  nombre: z.string(),
  tipo: z.string().nullable(),
  operacion: z.string().nullable(),
  isla: z.string().nullable(),
  municipio: z.string().nullable(),
  mapPrivacyMode: z.enum(MAP_PRIVACY_MODES),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  locationApprox: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  precioMin: z.number().nullable(),
  precioMax: z.number().nullable(),
  superficieMin: z.number().nullable(),
  superficieMax: z.number().nullable(),
  dormitorios: z.number().nullable(),
  banios: z.number().nullable(),
  updatedAt: z.string().datetime(),
});

export type PromocionResponse = z.infer<typeof promocionResponseSchema>;
