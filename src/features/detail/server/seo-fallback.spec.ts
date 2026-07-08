/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import { buildSeoFallback } from "./get-detail-data";

describe("buildSeoFallback", () => {
  it("generates fallback title when seoTitle is null", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 3,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Piso en venta en Santa Cruz — 3 dormitorios | Domio",
    );
  });

  it("generates fallback title when seoTitle is empty string", () => {
    const result = buildSeoFallback({
      seoTitle: "",
      seoDescription: null,
      propertyType: "ático",
      operation: "RENT",
      municipality: "La Laguna",
      bedrooms: 2,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Ático en alquiler en La Laguna — 2 dormitorios | Domio",
    );
  });

  it("uses provided seoTitle when present", () => {
    const result = buildSeoFallback({
      seoTitle: "Ático de lujo en La Laguna — 2 hab | Domio",
      seoDescription: null,
      propertyType: "ático",
      operation: "RENT",
      municipality: "La Laguna",
      bedrooms: 2,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Ático de lujo en La Laguna — 2 hab | Domio",
    );
  });

  it("generates fallback title with operation RENT", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "casa",
      operation: "RENT",
      municipality: "Adeje",
      bedrooms: 4,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Casa en alquiler en Adeje — 4 dormitorios | Domio",
    );
  });

  it("generates fallback title with SALE_AND_RENT", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "chalet",
      operation: "SALE_AND_RENT",
      municipality: "Puerto de la Cruz",
      bedrooms: 5,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Chalet en venta y alquiler en Puerto de la Cruz — 5 dormitorios | Domio",
    );
  });

  it("generates fallback title with null propertyType as generic", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: null,
      operation: "SALE",
      municipality: "Los Cristianos",
      bedrooms: 2,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Inmueble en venta en Los Cristianos — 2 dormitorios | Domio",
    );
  });

  it("generates fallback title with null bedrooms", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "local",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: null,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Local en venta en Santa Cruz | Domio",
    );
  });

  it("generates fallback description from descripcionGeneral truncated to ~155 chars", () => {
    const longText =
      "Este precioso piso en el centro de Santa Cruz cuenta con 3 dormitorios, " +
      "2 baños completos, cocina equipada, salón comedor con amplias vistas, " +
      "terraza de 15 m², armarios empotrados, y aire acondicionado en todas " +
      "las estancias. La finca dispone de ascensor y plaza de garaje opcional.";
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 3,
      descripcionGeneral: longText,
    });

    expect(result.description).toBeDefined();
    expect(result.description.length).toBeLessThanOrEqual(160);
    expect(result.description).toBe(longText.slice(0, 155).trimEnd() + "…");
  });

  it("truncates at 155 chars respecting existing truncation", () => {
    const shortText = "Texto exactamente de 155 caracteres. ".repeat(5);
    const exact155 = shortText.slice(0, 155);
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: exact155 + " y más contenido",
    });

    expect(result.description).toBe(exact155.trimEnd() + "…");
  });

  it("uses provided seoDescription when present", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: "Ático espectacular en primera línea de playa",
      propertyType: "ático",
      operation: "SALE",
      municipality: "Adeje",
      bedrooms: 2,
      descripcionGeneral: null,
    });

    expect(result.description).toBe(
      "Ático espectacular en primera línea de playa",
    );
  });

  it("generates fallback description when descripcionGeneral is null", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: null,
    });

    expect(result.description).toBe(
      "Piso en venta en Santa Cruz — 2 dormitorios. Descubre esta increíble propiedad en Domio.",
    );
  });

  it("handles edge case: empty descripcionGeneral string", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: "",
    });

    expect(result.description).toBe(
      "Piso en venta en Santa Cruz — 2 dormitorios. Descubre esta increíble propiedad en Domio.",
    );
  });

  it("handles edge case: descripcionGeneral shorter than 155 chars", () => {
    const shortText = "Piso reformado en el centro.";
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: shortText,
    });

    expect(result.description).toBe(shortText);
  });

  it("truncates at 155 chars with ellipsis", () => {
    const text =
      "Palabra1 palabra2 palabra3 palabra4 palabra5 palabra6 palabra7 " +
      "palabra8 palabra9 palabra10 palabra11 palabra12 palabra13 palabra14 " +
      "palabra15 palabra16 palabra17 palabra18 palabra19 palabra20 palabra21 " +
      "palabra22 palabra23 palabra24 palabra25 palabra26 palabra27 palabra28 " +
      "palabra29";
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: text,
    });

    expect(result.description.length).toBeLessThanOrEqual(160);
    // Should end with ellipsis since text is long
    expect(result.description).toMatch(/…$/u);
    // Should be slice(0,155) + "…"
    expect(result.description).toBe(text.slice(0, 155).trimEnd() + "…");
  });

  it("handles unknown propertyType as 'Inmueble'", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "unknown_type",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Inmueble en venta en Santa Cruz — 2 dormitorios | Domio",
    );
  });

  it("handles unknown operation as 'operación'", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "UNKNOWN_OP",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Piso en operación en Santa Cruz — 2 dormitorios | Domio",
    );
  });

  it("handles null municipality as 'zona desconocida'", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: null,
      bedrooms: 2,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Piso en venta en zona desconocida — 2 dormitorios | Domio",
    );
  });

  it("strips HTML tags from descripcionGeneral for fallback description", () => {
    const htmlText = "<p>Piso <strong>reformado</strong> en el centro con <em>vistas al mar</em>.</p>";
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: htmlText,
    });

    expect(result.description).toBe(
      "Piso reformado en el centro con vistas al mar.",
    );
  });

  it("uses fallback description when descripcionGeneral has only HTML tags (empty after strip)", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "piso",
      operation: "SALE",
      municipality: "Santa Cruz",
      bedrooms: 2,
      descripcionGeneral: "<p></p>",
    });

    expect(result.description).toBe(
      "Piso en venta en Santa Cruz — 2 dormitorios. Descubre esta increíble propiedad en Domio.",
    );
  });

  it("handles bedrooms=0 as 'no dormitorios part' in the title", () => {
    const result = buildSeoFallback({
      seoTitle: null,
      seoDescription: null,
      propertyType: "estudio",
      operation: "RENT",
      municipality: "La Laguna",
      bedrooms: 0,
      descripcionGeneral: null,
    });

    expect(result.title).toBe(
      "Estudio en alquiler en La Laguna | Domio",
    );
  });
});
