import { z } from "zod";
import { UNIT_STATUSES } from "@/shared/constants/db-enums";

/**
 * Schema Zod para validación de unidades de vivienda.
 *
 * - `identifier`: string nullable con máximo 50 caracteres.
 * - `status`: enum del set cerrado UNIT_STATUSES, por defecto AVAILABLE.
 */
export const UnidadSchema = z.object({
  identifier: z
    .string()
    .max(50, "El identificador no puede exceder 50 caracteres")
    .nullable()
    .optional(),
  status: z.enum(UNIT_STATUSES).default("AVAILABLE"),
});

export type UnidadPayload = z.infer<typeof UnidadSchema>;
