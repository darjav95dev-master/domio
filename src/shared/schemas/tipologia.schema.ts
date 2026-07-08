import { z } from "zod";
import { AMENITIES, ENERGY_CERTS } from "@/shared/constants/db-enums";

/**
 * Schema Zod para validación de tipologías.
 *
 * - `amenities` validado contra el set cerrado `AMENITIES` de `db-enums.ts`.
 * - `energyCert` validado contra `ENERGY_CERTS`.
 * - Todos los campos numéricos opcionales son positive int con límites definidos.
 */
export const TipologiaSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(150, "El nombre no puede exceder 150 caracteres"),
  usefulArea: z
    .number()
    .int("La superficie útil debe ser un número entero")
    .positive("La superficie útil debe ser positiva")
    .nullable()
    .optional(),
  builtArea: z
    .number()
    .int("La superficie construida debe ser un número entero")
    .positive("La superficie construida debe ser positiva")
    .nullable()
    .optional(),
  floors: z
    .number()
    .int("El número de plantas debe ser un número entero")
    .positive("El número de plantas debe ser positivo")
    .nullable()
    .optional(),
  bedrooms: z
    .number()
    .int("El número de dormitorios debe ser un número entero")
    .min(0, "El número de dormitorios no puede ser negativo")
    .max(10, "El número de dormitorios no puede exceder 10")
    .nullable()
    .optional(),
  bathrooms: z
    .number()
    .int("El número de baños debe ser un número entero")
    .min(0, "El número de baños no puede ser negativo")
    .max(10, "El número de baños no puede exceder 10")
    .nullable()
    .optional(),
  yearBuilt: z
    .number()
    .int("El año debe ser un número entero")
    .min(1800, "El año no puede ser anterior a 1800")
    .max(2100, "El año no puede ser posterior a 2100")
    .nullable()
    .optional(),
  energyCert: z.enum(ENERGY_CERTS).nullable().optional(),
  referencePriceSale: z
    .number()
    .int("El precio de venta debe ser un número entero")
    .positive("El precio de venta debe ser positivo")
    .nullable()
    .optional(),
  referencePriceRent: z
    .number()
    .int("El precio de alquiler debe ser un número entero")
    .positive("El precio de alquiler debe ser positivo")
    .nullable()
    .optional(),
  communityFee: z
    .number()
    .int("Los gastos de comunidad deben ser un número entero")
    .positive("Los gastos de comunidad deben ser positivos")
    .nullable()
    .optional(),
  deposit: z
    .number()
    .int("La fianza debe ser un número entero")
    .positive("La fianza debe ser positiva")
    .nullable()
    .optional(),
  amenities: z
    .array(z.enum(AMENITIES, { message: "Amenity no válido" }))
    .default([]),
  planAssetId: z.string().uuid("El ID del plano debe ser un UUID válido").nullable().optional(),
});

export type TipologiaPayload = z.infer<typeof TipologiaSchema>;
