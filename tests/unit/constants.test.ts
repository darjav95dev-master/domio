import { describe, it, expect } from "vitest";
import {
  PROPERTY_TYPE_LABELS,
  CONSTRUCTION_STATUS_LABELS,
  OPERATION_TYPE_LABELS,
  LEAD_STATUS_LABELS,
  PROMOTION_STATUS_LABELS,
  USER_ROLE_LABELS,
  AMENITY_LABELS,
} from "@/shared/constants/domain-labels";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PROMOCION_NAME_MAX_LENGTH,
  LEAD_MESSAGE_MAX_LENGTH,
  LEAD_NAME_MAX_LENGTH,
  LEAD_EMAIL_MAX_LENGTH,
  SEO_TITLE_MAX_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
} from "@/shared/constants/domain-config";
import {
  PROPERTY_TYPES,
  CONSTRUCTION_STATUSES,
  OPERATION_TYPES,
  LEAD_STATUSES,
  PROMOCION_STATUSES,
  USER_ROLES,
  AMENITIES,
} from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Exhaustividad: cada label map cubre todos los valores del enum
// ---------------------------------------------------------------------------

describe("domain-labels exhaustiveness", () => {
  it("PROPERTY_TYPE_LABELS cubre todos los PROPERTY_TYPES", () => {
    const labelKeys = Object.keys(PROPERTY_TYPE_LABELS);
    expect(labelKeys).toHaveLength(PROPERTY_TYPES.length);
    for (const value of PROPERTY_TYPES) {
      expect(PROPERTY_TYPE_LABELS[value]).toBeDefined();
    }
  });

  it("CONSTRUCTION_STATUS_LABELS cubre todos los CONSTRUCTION_STATUSES", () => {
    const labelKeys = Object.keys(CONSTRUCTION_STATUS_LABELS);
    expect(labelKeys).toHaveLength(CONSTRUCTION_STATUSES.length);
    for (const value of CONSTRUCTION_STATUSES) {
      expect(CONSTRUCTION_STATUS_LABELS[value]).toBeDefined();
    }
  });

  it("OPERATION_TYPE_LABELS cubre todos los OPERATION_TYPES", () => {
    const labelKeys = Object.keys(OPERATION_TYPE_LABELS);
    expect(labelKeys).toHaveLength(OPERATION_TYPES.length);
    for (const value of OPERATION_TYPES) {
      expect(OPERATION_TYPE_LABELS[value]).toBeDefined();
    }
  });

  it("LEAD_STATUS_LABELS cubre todos los LEAD_STATUSES", () => {
    const labelKeys = Object.keys(LEAD_STATUS_LABELS);
    expect(labelKeys).toHaveLength(LEAD_STATUSES.length);
    for (const value of LEAD_STATUSES) {
      expect(LEAD_STATUS_LABELS[value]).toBeDefined();
    }
  });

  it("PROMOTION_STATUS_LABELS cubre todos los PROMOCION_STATUSES", () => {
    const labelKeys = Object.keys(PROMOTION_STATUS_LABELS);
    expect(labelKeys).toHaveLength(PROMOCION_STATUSES.length);
    for (const value of PROMOCION_STATUSES) {
      expect(PROMOTION_STATUS_LABELS[value]).toBeDefined();
    }
  });

  it("USER_ROLE_LABELS cubre todos los USER_ROLES", () => {
    const labelKeys = Object.keys(USER_ROLE_LABELS);
    expect(labelKeys).toHaveLength(USER_ROLES.length);
    for (const value of USER_ROLES) {
      expect(USER_ROLE_LABELS[value]).toBeDefined();
    }
  });

  it("AMENITY_LABELS cubre todos los AMENITIES", () => {
    const labelKeys = Object.keys(AMENITY_LABELS);
    expect(labelKeys).toHaveLength(AMENITIES.length);
    for (const value of AMENITIES) {
      expect(AMENITY_LABELS[value]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad en tiempo de compilación: tipo readonly
// ---------------------------------------------------------------------------

describe("domain-labels immutability", () => {
  it("PROPERTY_TYPE_LABELS es un Record inmutable por tipo", () => {
    // TypeScript garantiza que `as const` hace el objeto readonly.
    // En runtime verificamos que no se pueda ampliar con new properties
    // porque el tipo lo prohibe (compile time).
    // Verificación adicional: Object.isFrozen si se aplicó.
    expect(Object.isFrozen(PROPERTY_TYPE_LABELS)).toBe(true);
  });

  it("AMENITY_LABELS no tiene propiedades mutables en runtime", () => {
    expect(Object.isFrozen(AMENITY_LABELS)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Config values positivos
// ---------------------------------------------------------------------------

describe("domain-config values", () => {
  it("DEFAULT_PAGE_SIZE es positivo", () => {
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
  });

  it("MAX_PAGE_SIZE es mayor o igual que DEFAULT_PAGE_SIZE", () => {
    expect(MAX_PAGE_SIZE).toBeGreaterThanOrEqual(DEFAULT_PAGE_SIZE);
  });

  it("PROMOCION_NAME_MAX_LENGTH es positivo", () => {
    expect(PROMOCION_NAME_MAX_LENGTH).toBeGreaterThan(0);
  });

  it("LEAD_MESSAGE_MAX_LENGTH es positivo", () => {
    expect(LEAD_MESSAGE_MAX_LENGTH).toBeGreaterThan(0);
  });

  it("LEAD_NAME_MAX_LENGTH es positivo", () => {
    expect(LEAD_NAME_MAX_LENGTH).toBeGreaterThan(0);
  });

  it("LEAD_EMAIL_MAX_LENGTH es positivo", () => {
    expect(LEAD_EMAIL_MAX_LENGTH).toBeGreaterThan(0);
  });

  it("SEO_TITLE_MAX_LENGTH es positivo", () => {
    expect(SEO_TITLE_MAX_LENGTH).toBeGreaterThan(0);
  });

  it("SEO_DESCRIPTION_MAX_LENGTH es positivo", () => {
    expect(SEO_DESCRIPTION_MAX_LENGTH).toBeGreaterThan(0);
  });

  it("THUMBNAIL_WIDTH es positivo", () => {
    expect(THUMBNAIL_WIDTH).toBeGreaterThan(0);
  });

  it("THUMBNAIL_HEIGHT es positivo", () => {
    expect(THUMBNAIL_HEIGHT).toBeGreaterThan(0);
  });
});
