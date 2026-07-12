import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailHero } from "./DetailHero";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Mock next/image
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element -- test mock of next/image
    return <img alt={alt as string} {...rest} />;
  },
}));

// ---------------------------------------------------------------------------
// Mock MediaImage
// ---------------------------------------------------------------------------

vi.mock("@/shared/components/media-image", () => ({
  MediaImage: (props: Record<string, unknown>) => {
    const { alt, className, ...rest } = props;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- test mock of next/image
      <img
        alt={alt as string}
        className={className as string}
        data-testid="media-image"
        {...rest}
      />
    );
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
    name: "Ático de lujo en Santa Cruz",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "ático",
    constructionStatus: "ON_PLAN",
    island: "Tenerife",
    municipality: "Santa Cruz de Tenerife",
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
        unidades: [],
      },
    ],
    contentBlocks: [],
    mediaAssets: [
      {
        id: "asset-1",
        tenantId: "tenant-1",
        ownerType: "PROMOCION",
        ownerId: "promo-1",
        kind: "IMAGE_GALLERY",
        r2Key: "https://r2.example.com/photo.jpg",
        mimeType: null,
        sizeBytes: null,
        altText: "Ático de lujo en Santa Cruz, ático, Santa Cruz de Tenerife",
        sortOrder: 0,
        isCover: true,
        createdAt: new Date(),
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DetailHero", () => {
  it("renders the property name as H1", () => {
    const promocion = createMockPromocion();
    render(<DetailHero promocion={promocion} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Ático de lujo en Santa Cruz" }),
    ).toBeInTheDocument();
  });

  it("renders municipality and island", () => {
    const promocion = createMockPromocion();
    render(<DetailHero promocion={promocion} />);
    expect(
      screen.getByText("Santa Cruz de Tenerife, Tenerife"),
    ).toBeInTheDocument();
  });

  it("renders the construction status badge", () => {
    const promocion = createMockPromocion();
    render(<DetailHero promocion={promocion} />);
    expect(screen.getByText("Sobre plano")).toBeInTheDocument();
  });

  it("renders Share and Favorite actions", () => {
    const promocion = createMockPromocion();
    render(<DetailHero promocion={promocion} />);
    expect(
      screen.getByRole("button", { name: /compartir/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("favorite-button")).toBeInTheDocument();
  });

  it("renders fallback gradient when no cover image", () => {
    const promocion = createMockPromocion({ mediaAssets: [] });
    const { container } = render(<DetailHero promocion={promocion} />);
    // Should have the gradient background (no MediaImage)
    const fallbackDiv = container.querySelector('[role="img"]');
    expect(fallbackDiv).toBeInTheDocument();
  });

  it("has proper aria-label on the section", () => {
    const promocion = createMockPromocion();
    render(<DetailHero promocion={promocion} />);
    expect(
      screen.getByLabelText("Detalle de Ático de lujo en Santa Cruz"),
    ).toBeInTheDocument();
  });
});
