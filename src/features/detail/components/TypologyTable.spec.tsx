import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TypologyTable } from "./TypologyTable";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/components/media-image", () => ({
  MediaImage: (props: Record<string, unknown>) => {
    const { alt } = props;
    // eslint-disable-next-line @next/next/no-img-element -- test mock of next/image
    return <img alt={alt as string} data-testid="media-image" />;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPromocion(
  overrides: Partial<PromocionDetail> = {},
): PromocionDetail {
  return {
    id: "promo-1",
    tenantId: "tenant-1",
    slug: "test-promo",
    name: "Test Promo",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "piso",
    constructionStatus: null,
    island: "Tenerife",
    municipality: "Santa Cruz",
    address: null,
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
    tipologias: [
      {
        id: "tipo-1",
        tenantId: "tenant-1",
        promocionId: "promo-1",
        name: "Tipo A",
        usefulArea: 80,
        builtArea: 95,
        floors: null,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: null,
        energyCert: null,
        referencePriceSale: 350000,
        referencePriceRent: null,
        communityFee: null,
        deposit: null,
        amenities: [],
        planAssetId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        unidades: [{ id: "u1", tenantId: "tenant-1", tipologiaId: "tipo-1", identifier: null, status: "AVAILABLE", createdAt: new Date(), updatedAt: new Date() }],
      },
    ],
    contentBlocks: [],
    mediaAssets: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TypologyTable", () => {
  it("renders table with all columns", () => {
    const promocion = createMockPromocion();
    render(<TypologyTable promocion={promocion} />);

    // Check headers
    expect(screen.getByText("Tipología")).toBeInTheDocument();
    expect(screen.getByText("Superficie")).toBeInTheDocument();
    expect(screen.getByText("Dorm.")).toBeInTheDocument();
    expect(screen.getByText("Baños")).toBeInTheDocument();
    expect(screen.getByText("Desde")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Plano")).toBeInTheDocument();
  });

  it("renders tipologia data correctly", () => {
    const promocion = createMockPromocion();
    const { container } = render(<TypologyTable promocion={promocion} />);

    expect(screen.getByText("Tipo A")).toBeInTheDocument();
    expect(screen.getByText("95 m²")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(container.textContent).toContain("350.000");
    expect(container.textContent).toContain("€");
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("returns null when no tipologias", () => {
    const promocion = createMockPromocion({ tipologias: [] });
    const { container } = render(<TypologyTable promocion={promocion} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows Consultar for null price", () => {
    const promocion = createMockPromocion({
      tipologias: [
        {
          id: "tipo-1",
          tenantId: "tenant-1",
          promocionId: "promo-1",
          name: "Tipo A",
          usefulArea: null,
          builtArea: null,
          floors: null,
          bedrooms: null,
          bathrooms: null,
          yearBuilt: null,
          energyCert: null,
          referencePriceSale: null,
          referencePriceRent: null,
          communityFee: null,
          deposit: null,
          amenities: [],
          planAssetId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          unidades: [],
        },
      ],
    });
    render(<TypologyTable promocion={promocion} />);
    expect(screen.getByText("Consultar")).toBeInTheDocument();
  });
});
