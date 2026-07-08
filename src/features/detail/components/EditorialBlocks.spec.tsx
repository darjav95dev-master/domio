/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { EditorialBlocks, shouldRenderBlock } from "./EditorialBlocks";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

type BlockType = "DESCRIPCION_GENERAL" | "MEMORIA_CALIDADES" | "ZONAS_COMUNES" | "UBICACION_SERVICIOS" | "PLAZOS_GARANTIAS";

function createMockBlock(
  id: string,
  blockType: BlockType,
  payload: Record<string, unknown> | null = {},
) {
  return {
    id,
    tenantId: "tenant-1",
    promocionId: "promo-1",
    blockType,
    payload,
    sortOrder: 0,
    updatedBy: null,
    updatedAt: new Date(),
  };
}

function createMockPromocion(
  kind: "portfolio" | "external",
  blocks: PromocionDetail["contentBlocks"],
): PromocionDetail {
  return {
    id: "promo-1",
    tenantId: "tenant-1",
    slug: "test-promo",
    name: "Test Promo",
    kind,
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "piso",
    constructionStatus: null,
    island: "Tenerife",
    municipality: "Santa Cruz",
    address: "Calle Test 123",
    location: [-16.2518, 28.468] as [number, number],
    locationApprox: [-16.25, 28.47] as [number, number],
    mapPrivacyMode: "EXACT",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    assignedAgentName: null,
    draftPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tipologias: [],
    contentBlocks: blocks,
    mediaAssets: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("shouldRenderBlock", () => {
  const ALWAYS_ALLOWED = [
    "DESCRIPCION_GENERAL",
    "MEMORIA_CALIDADES",
    "UBICACION_SERVICIOS",
  ] as const;

  const PORTFOLIO_ONLY = ["ZONAS_COMUNES", "PLAZOS_GARANTIAS"] as const;

  ALWAYS_ALLOWED.forEach((type) => {
    it(`allows ${type} for any kind`, () => {
      expect(shouldRenderBlock(type, "portfolio")).toBe(true);
      expect(shouldRenderBlock(type, "external")).toBe(true);
    });
  });

  PORTFOLIO_ONLY.forEach((type) => {
    it(`allows ${type} only for portfolio kind`, () => {
      expect(shouldRenderBlock(type, "portfolio")).toBe(true);
      expect(shouldRenderBlock(type, "external")).toBe(false);
    });
  });
});

describe("EditorialBlocks", () => {
  it("renders nothing when no content blocks", () => {
    const promocion = createMockPromocion("portfolio", []);
    const { container } = render(<EditorialBlocks promocion={promocion} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all 5 block types for portfolio", () => {
    const blocks = [
      createMockBlock("b1", "DESCRIPCION_GENERAL", {
        text: "<p>Descripción</p>",
      }),
      createMockBlock("b2", "MEMORIA_CALIDADES", {
        items: [{ title: "Calidad", description: "Alta" }],
      }),
      createMockBlock("b3", "ZONAS_COMUNES", {
        items: [{ name: "Piscina", description: "Comunitaria" }],
      }),
      createMockBlock("b4", "UBICACION_SERVICIOS", {
        items: [{ service: "Colegio", distance: "300m" }],
      }),
      createMockBlock("b5", "PLAZOS_GARANTIAS", {
        delivery: "2026-12",
        license: "Sí",
        guarantee: "Sí",
        audit: "Sí",
      }),
    ];
    const promocion = createMockPromocion("portfolio", blocks);
    const { container } = render(<EditorialBlocks promocion={promocion} />);

    // All 5 blocks should render
    const headings = container.querySelectorAll("h2");
    const labels = Array.from(headings).map((h) => h.textContent);
    expect(labels).toContain("Descripción");
    expect(labels).toContain("Calidades");
    expect(labels).toContain("Zonas comunes");
    expect(labels).toContain("Ubicación");
    expect(labels).toContain("Plazos");
  });

  it("skips ZONAS_COMUNES and PLAZOS_GARANTIAS for external kind", () => {
    const blocks = [
      createMockBlock("b1", "DESCRIPCION_GENERAL", {
        text: "<p>Descripción</p>",
      }),
      createMockBlock("b2", "MEMORIA_CALIDADES", {
        items: [{ title: "Calidad", description: "Alta" }],
      }),
      createMockBlock("b3", "ZONAS_COMUNES", {
        items: [{ name: "Piscina", description: "Comunitaria" }],
      }),
      createMockBlock("b4", "UBICACION_SERVICIOS", {
        items: [{ service: "Colegio", distance: "300m" }],
      }),
      createMockBlock("b5", "PLAZOS_GARANTIAS", {
        delivery: "2026-12",
      }),
    ];
    const promocion = createMockPromocion("external", blocks);
    const { container } = render(<EditorialBlocks promocion={promocion} />);

    // Only the allowed blocks should render
    const headings = container.querySelectorAll("h2");
    const labels = Array.from(headings).map((h) => h.textContent);
    expect(labels).toContain("Descripción");
    expect(labels).toContain("Calidades");
    expect(labels).toContain("Ubicación");

    // These should NOT render for external
    expect(labels).not.toContain("Zonas comunes");
    expect(labels).not.toContain("Plazos");
  });

  it("renders blocks in canonical order", () => {
    const blocks = [
      // Out of order
      createMockBlock("b5", "PLAZOS_GARANTIAS", {
        delivery: "2026-12",
      }),
      createMockBlock("b1", "DESCRIPCION_GENERAL", {
        text: "<p>Descripción</p>",
      }),
      createMockBlock("b3", "ZONAS_COMUNES", {
        items: [{ name: "Piscina", description: "Comunitaria" }],
      }),
    ];
    const promocion = createMockPromocion("portfolio", blocks);
    const { container } = render(<EditorialBlocks promocion={promocion} />);

    const headings = container.querySelectorAll("h2");
    const labels = Array.from(headings).map((h) => h.textContent);
    expect(labels).toEqual(["Descripción", "Zonas comunes", "Plazos"]);
  });
});
