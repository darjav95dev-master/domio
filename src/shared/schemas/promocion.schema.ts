import { z } from "zod";
import {
  PROMOCION_KINDS,
  PROMOCION_STATUSES,
  OPERATION_TYPES,
  PROPERTY_TYPES,
  CONSTRUCTION_STATUSES,
  MAP_PRIVACY_MODES,
} from "@/shared/constants/db-enums";
import { PROMOCION_NAME_MAX_LENGTH } from "@/shared/constants/domain-config";

const NAME_MIN_MSG = "El nombre debe tener al menos 3 caracteres";
const NAME_MAX_MSG = `El nombre no puede exceder ${PROMOCION_NAME_MAX_LENGTH} caracteres`;

const nameField = () =>
  z
    .string()
    .min(3, NAME_MIN_MSG)
    .max(PROMOCION_NAME_MAX_LENGTH, NAME_MAX_MSG);

/**
 * Schema para creación de promoción (mínimo necesario para crear un DRAFT).
 */
export const PromocionCreateSchema = z.object({
  name: nameField(),
  kind: z.enum(PROMOCION_KINDS),
});

export type PromocionCreatePayload = z.infer<typeof PromocionCreateSchema>;

/**
 * Schema para actualización de promoción.
 *
 * Todos los campos son opcionales, pero si `status` es `PUBLISHED`,
 * se exigen `name`, `operation`, `propertyType` y `mapPrivacyMode`.
 */
export const PromocionUpdateSchema = z
  .object({
    name: nameField().optional(),
    kind: z.enum(PROMOCION_KINDS).optional(),
    status: z.enum(PROMOCION_STATUSES).optional(),
    operation: z.enum(OPERATION_TYPES).nullable().optional(),
    propertyType: z.enum(PROPERTY_TYPES).nullable().optional(),
    constructionStatus: z.enum(CONSTRUCTION_STATUSES).nullable().optional(),
    island: z.string().max(100, "La isla no puede exceder 100 caracteres").nullable().optional(),
    municipality: z.string().max(100, "El municipio no puede exceder 100 caracteres").nullable().optional(),
    address: z.string().max(300, "La dirección no puede exceder 300 caracteres").nullable().optional(),
    mapPrivacyMode: z.enum(MAP_PRIVACY_MODES).optional(),
    seoTitle: z.string().max(70, "El título SEO no puede exceder 70 caracteres").nullable().optional(),
    seoDescription: z.string().max(160, "La descripción SEO no puede exceder 160 caracteres").nullable().optional(),
    location: z.object({ lng: z.number(), lat: z.number() }).nullable().optional(),
    locationApprox: z.object({ lng: z.number(), lat: z.number() }).nullable().optional(),
    assignedAgentId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Si status es PUBLISHED, validar campos obligatorios
    if (data.status === "PUBLISHED") {
      if (!data.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "El nombre es obligatorio para promociones publicadas",
          path: ["name"],
        });
      }
      if (!data.operation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La operación es obligatoria para promociones publicadas",
          path: ["operation"],
        });
      }
      if (!data.propertyType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "El tipo de propiedad es obligatorio para promociones publicadas",
          path: ["propertyType"],
        });
      }
      if (!data.mapPrivacyMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "El modo de privacidad del mapa es obligatorio para promociones publicadas",
          path: ["mapPrivacyMode"],
        });
      }
    }
  });

/**
 * Schema para payload de unidad dentro de tipología.
 */
const UnidadPayloadSchema = z.object({
  _tempId: z.string(),
  id: z.string().uuid().optional(),
  identifier: z.string().nullable().optional(),
  status: z.string(),
});

/**
 * Schema para payload de tipología dentro de promoción.
 */
const TipologiaPayloadSchema = z.object({
  _tempId: z.string(),
  id: z.string().uuid().optional(),
  name: z.string(),
  usefulArea: z.number().int().nullable().optional(),
  builtArea: z.number().int().nullable().optional(),
  floors: z.number().int().nullable().optional(),
  bedrooms: z.number().int().nullable().optional(),
  bathrooms: z.number().int().nullable().optional(),
  yearBuilt: z.number().int().nullable().optional(),
  energyCert: z.string().nullable().optional(),
  referencePriceSale: z.number().int().nullable().optional(),
  referencePriceRent: z.number().int().nullable().optional(),
  communityFee: z.number().int().nullable().optional(),
  deposit: z.number().int().nullable().optional(),
  amenities: z.array(z.string()).optional(),
  unidades: z.array(UnidadPayloadSchema).optional(),
});

/**
 * Schema extendido para actualización con tipologías anidadas.
 * Incluye todos los campos de PromocionUpdateSchema más un array
 * opcional de tipologías con sus unidades.
 */
export const PromocionWithTipologiasUpdateSchema = PromocionUpdateSchema.extend({
  tipologias: z.array(TipologiaPayloadSchema).optional(),
});

export type PromocionUpdatePayload = z.infer<typeof PromocionUpdateSchema>;
export type PromocionWithTipologiasUpdatePayload = z.infer<
  typeof PromocionWithTipologiasUpdateSchema
>;

/**
 * Schema para snapshot completo del formulario (autoguardado de borrador).
 * No tiene validaciones condicionales de PUBLISHED — el draft puede
 * estar incompleto.
 */
export const PromocionDraftSchema = z.object({
  name: nameField(),
  kind: z.enum(PROMOCION_KINDS),
  status: z.enum(PROMOCION_STATUSES),
  operation: z.enum(OPERATION_TYPES).nullable().optional(),
  propertyType: z.enum(PROPERTY_TYPES).nullable().optional(),
  constructionStatus: z.enum(CONSTRUCTION_STATUSES).nullable().optional(),
    island: z.string().max(100, "La isla no puede exceder 100 caracteres").nullable().optional(),
    municipality: z.string().max(100, "El municipio no puede exceder 100 caracteres").nullable().optional(),
    address: z.string().max(300, "La dirección no puede exceder 300 caracteres").nullable().optional(),
    mapPrivacyMode: z.enum(MAP_PRIVACY_MODES).optional(),
    seoTitle: z.string().max(70, "El título SEO no puede exceder 70 caracteres").nullable().optional(),
    seoDescription: z.string().max(160, "La descripción SEO no puede exceder 160 caracteres").nullable().optional(),
    location: z.object({ lng: z.number(), lat: z.number() }).nullable().optional(),
    locationApprox: z.object({ lng: z.number(), lat: z.number() }).nullable().optional(),
    assignedAgentId: z.string().uuid().nullable().optional(),
  });

export type PromocionDraftPayload = z.infer<typeof PromocionDraftSchema>;
