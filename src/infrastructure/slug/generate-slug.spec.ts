import { describe, it, expect } from "vitest";
import { generateSlug } from "./generate-slug";

describe("generateSlug", () => {
  const shortId = "a4c9";
  const SAMPLE_SLUG = "piso-en-venta-en-santa-cruz-3hab-a4c9";

  it("genera slug con formato correcto: {tipo}-en-{operacion}-en-{municipio}-{n}hab-{idCorto}", () => {
    const slug = generateSlug("piso", "SALE", "Santa Cruz", 3, shortId);
    expect(slug).toBe(SAMPLE_SLUG);
  });

  it("convierte a lowercase", () => {
    const slug = generateSlug("PISO", "SALE", "SANTA CRUZ", 3, shortId);
    expect(slug).toBe(SAMPLE_SLUG);
  });

  it("elimina acentos (á → a, é → e, í → i, ó → o, ú → u)", () => {
    const slug = generateSlug("ático", "SALE", "San Blas-Canillejas", 2, shortId);
    expect(slug).toBe("atico-en-venta-en-san-blas-canillejas-2hab-a4c9");
  });

  it("reemplaza espacios por guiones", () => {
    const slug = generateSlug("casa", "RENT", "Puerto de la Cruz", 4, shortId);
    expect(slug).toBe("casa-en-alquiler-en-puerto-de-la-cruz-4hab-a4c9");
  });

  it("elimina caracteres especiales no alfanuméricos", () => {
    const slug = generateSlug("local", "SALE", "San José (Capital)", 1, shortId);
    expect(slug).toBe("local-en-venta-en-san-jose-capital-1hab-a4c9");
  });

  it("usa 'estudio' en lugar de '0hab' cuando bedrooms es 0", () => {
    const slug = generateSlug("estudio", "SALE", "La Laguna", 0, shortId);
    expect(slug).toBe("estudio-en-venta-en-la-laguna-estudio-a4c9");
  });

  it("mapea SALE a 'venta'", () => {
    const slug = generateSlug("piso", "SALE", "Arona", 2, shortId);
    expect(slug).toContain("-venta-");
  });

  it("mapea RENT a 'alquiler'", () => {
    const slug = generateSlug("piso", "RENT", "Arona", 2, shortId);
    expect(slug).toContain("-alquiler-");
  });

  it("mapea SALE_AND_RENT a 'venta-y-alquiler'", () => {
    const slug = generateSlug("piso", "SALE_AND_RENT", "Arona", 2, shortId);
    expect(slug).toContain("-venta-y-alquiler-");
  });

  it("slug diferente para distintos shortId (uniqueness)", () => {
    const slug1 = generateSlug("piso", "SALE", "La Orotava", 3, "a4c9");
    const slug2 = generateSlug("piso", "SALE", "La Orotava", 3, "b7d2");
    expect(slug1).not.toBe(slug2);
  });

  it("funciona con todos los PROPERTY_TYPES", () => {
    const types = [
      "piso", "ático", "casa", "chalet", "dúplex", "estudio",
      "local", "oficina", "nave", "garaje", "trastero", "terreno",
    ] as const;
    for (const tipo of types) {
      const slug = generateSlug(tipo, "SALE", "Municipio", 2, shortId);
      // Formato: {tipo}-en-{operacion}-en-{municipio}-{habs}-{idCorto}
      // 5 segmentos de texto + habs + id
      expect(slug).toMatch(/^[a-z]+(-[a-z]+){4}-\d+hab-[a-z0-9]+$/);
    }
  });

  it("slug sin caracteres extraños", () => {
    const slug = generateSlug("dúplex", "RENT", "Los Cristianos (centro)", 3, "f1g2");
    expect(slug).toBe("duplex-en-alquiler-en-los-cristianos-centro-3hab-f1g2");
  });

  it("maneja municipio con múltiples espacios", () => {
    const slug = generateSlug("piso", "SALE", "San  Cristóbal  de  La  Laguna", 2, shortId);
    expect(slug).toBe("piso-en-venta-en-san-cristobal-de-la-laguna-2hab-a4c9");
  });
});
