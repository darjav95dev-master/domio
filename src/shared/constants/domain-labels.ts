import type {
  PropertyType,
  ConstructionStatus,
  OperationType,
  LeadStatus,
  PromocionStatus,
  UserRole,
  Amenity,
} from "./db-enums";

/**
 * Labels de presentación en español para cada conjunto cerrado del dominio.
 * Cada mapa es `Record<EnumValue, string>` y cubre exhaustivamente todos
 * los valores del enum correspondiente.
 * Los objetos están congelados en runtime para garantizar inmutabilidad.
 */

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> =
  Object.freeze({
    piso: "Piso",
    ático: "Ático",
    casa: "Casa",
    chalet: "Chalet",
    dúplex: "Dúplex",
    estudio: "Estudio",
    local: "Local",
    oficina: "Oficina",
    nave: "Nave",
    garaje: "Garaje",
    trastero: "Trastero",
    terreno: "Terreno",
  });

export const CONSTRUCTION_STATUS_LABELS: Record<ConstructionStatus, string> =
  Object.freeze({
    ON_PLAN: "Sobre plano",
    IN_CONSTRUCTION: "En construcción",
    READY: "Entrega inmediata",
  });

export const OPERATION_TYPE_LABELS: Record<OperationType, string> =
  Object.freeze({
    SALE: "Venta",
    RENT: "Alquiler",
    SALE_AND_RENT: "Venta y alquiler",
  });

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = Object.freeze({
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  IN_NEGOTIATION: "En negociación",
  WON: "Ganado",
  LOST: "Perdido",
});

export const PROMOTION_STATUS_LABELS: Record<PromocionStatus, string> =
  Object.freeze({
    DRAFT: "Borrador",
    PUBLISHED: "Publicado",
    RESERVED: "Reservado",
    SOLD: "Vendido",
    RENTED: "Alquilado",
    WITHDRAWN: "Retirado",
  });

export const USER_ROLE_LABELS: Record<UserRole, string> = Object.freeze({
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  AGENT: "Agente",
});

export const AMENITY_LABELS: Record<Amenity, string> = Object.freeze({
  ascensor: "Ascensor",
  terraza: "Terraza",
  balcón: "Balcón",
  piscina: "Piscina",
  garaje: "Garaje",
  trastero: "Trastero",
  calefacción: "Calefacción",
  aire_acondicionado: "Aire acondicionado",
  amueblado: "Amueblado",
  mascotas_permitidas: "Mascotas permitidas",
  accesible: "Accesible",
  zonas_verdes: "Zonas verdes",
  seguridad: "Seguridad",
});
