import { z } from "zod";
import { AMENITIES, ENERGY_CERTS } from "@/shared/constants/db-enums";

/**
 * Schema Zod para validación de payloads de tipología.
 * Referencia los enums `AMENITIES` y `ENERGY_CERTS` de `db-enums.ts`.
 */
export const tipologiaSchema = z.object({
  name: z.string().min(1),
  usefulArea: z.number().int().positive().nullable(),
  builtArea: z.number().int().positive().nullable(),
  bedrooms: z.number().int().min(0).nullable(),
  bathrooms: z.number().int().min(0).nullable(),
  amenities: z.array(z.enum(AMENITIES)).default([]),
  energyCert: z.enum(ENERGY_CERTS).nullable(),
  referencePriceSale: z.number().int().positive().nullable(),
  referencePriceRent: z.number().int().positive().nullable(),
});

export type TipologiaPayload = z.infer<typeof tipologiaSchema>;
