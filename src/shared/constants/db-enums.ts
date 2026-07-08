export const USER_ROLES = ["ADMIN", "OPERATOR", "AGENT"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROMOCION_KINDS = ["portfolio", "external"] as const;
export type PromocionKind = (typeof PROMOCION_KINDS)[number];

export const PROMOCION_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "RESERVED",
  "SOLD",
  "RENTED",
  "WITHDRAWN",
] as const;
export type PromocionStatus = (typeof PROMOCION_STATUSES)[number];

export const OPERATION_TYPES = ["SALE", "RENT", "SALE_AND_RENT"] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export const PROPERTY_TYPES = [
  "piso",
  "ático",
  "casa",
  "chalet",
  "dúplex",
  "estudio",
  "local",
  "oficina",
  "nave",
  "garaje",
  "trastero",
  "terreno",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const CONSTRUCTION_STATUSES = [
  "ON_PLAN",
  "IN_CONSTRUCTION",
  "READY",
] as const;
export type ConstructionStatus = (typeof CONSTRUCTION_STATUSES)[number];

export const MAP_PRIVACY_MODES = ["EXACT", "AREA"] as const;
export type MapPrivacyMode = (typeof MAP_PRIVACY_MODES)[number];

export const UNIT_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "RENTED"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "IN_NEGOTIATION",
  "WON",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ["commercial", "institutional"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_CHANNELS = ["FORM", "WHATSAPP"] as const;
export type LeadChannel = (typeof LEAD_CHANNELS)[number];

export const MEDIA_ASSET_KINDS = ["IMAGE_GALLERY", "PLAN", "DOCUMENT"] as const;
export type MediaAssetKind = (typeof MEDIA_ASSET_KINDS)[number];

export const MEDIA_ASSET_OWNER_TYPES = ["PROMOCION", "TIPOLOGIA", "CONTENT"] as const;
export type MediaAssetOwnerType = (typeof MEDIA_ASSET_OWNER_TYPES)[number];

export const CONTENT_BLOCK_TYPES = [
  "DESCRIPCION_GENERAL",
  "MEMORIA_CALIDADES",
  "ZONAS_COMUNES",
  "UBICACION_SERVICIOS",
  "PLAZOS_GARANTIAS",
] as const;
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export const ENERGY_CERTS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "EN_TRAMITE",
] as const;
export type EnergyCert = (typeof ENERGY_CERTS)[number];

export const ARSOP_REQUEST_TYPES = ["EXPORT", "DELETE"] as const;
export type ArsopRequestType = (typeof ARSOP_REQUEST_TYPES)[number];

export const EMAIL_STATUSES = ["PENDING", "SENT", "FAILED"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const EMAIL_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;

export const AMENITIES = [
  "ascensor",
  "terraza",
  "balcón",
  "piscina",
  "garaje",
  "trastero",
  "calefacción",
  "aire_acondicionado",
  "amueblado",
  "mascotas_permitidas",
  "accesible",
  "zonas_verdes",
  "seguridad",
] as const;
export type Amenity = (typeof AMENITIES)[number];
