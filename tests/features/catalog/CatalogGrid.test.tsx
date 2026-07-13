import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CatalogItem } from "@/features/catalog/components/PropertyCard";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

import { CatalogGrid } from "@/features/catalog/components/CatalogGrid";

function makeItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "p1",
    slug: "test-property",
    name: "Test Property",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "piso",
    island: "Tenerife",
    municipality: "Santa Cruz",
    address: "Calle Test 1",
    price: 200000,
    currency: "EUR",
    imageUrl: null,
    bedrooms: 3,
    bathrooms: 2,
    location: [28.47, -16.25],
    locationApprox: [28.47, -16.25],
    mapPrivacyMode: "EXACT",
    seoTitle: null,
    seoDescription: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  };
}

describe("CatalogGrid", () => {
  it("renders the result count with aria-live polite", () => {
    render(
      <CatalogGrid items={[makeItem()]} total={1} nextCursor={null} />,
    );
    const count = screen.getByText("1 inmueble encontrado");
    expect(count).toBeInTheDocument();
    expect(count.closest("[aria-live='polite']")).toBeInTheDocument();
  });

  it("renders plural result count for multiple items", () => {
    render(
      <CatalogGrid
        items={[makeItem({ id: "p1" }), makeItem({ id: "p2" })]}
        total={2}
        nextCursor={null}
      />,
    );
    expect(screen.getByText("2 inmuebles encontrados")).toBeInTheDocument();
  });

  it("renders property cards in the grid", () => {
    render(
      <CatalogGrid
        items={[makeItem({ name: "Casa del Mar" })]}
        total={1}
        nextCursor={null}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Casa del Mar" }),
    ).toBeInTheDocument();
  });

  it("renders the 'Siguiente' link when nextCursor is present", () => {
    render(
      <CatalogGrid
        items={[makeItem()]}
        total={13}
        nextCursor="cursor-abc"
      />,
    );
    const link = screen.getByRole("link", { name: /siguiente/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", expect.stringContaining("cursor=cursor-abc"));
  });

  it("does not render 'Siguiente' when nextCursor is null", () => {
    render(
      <CatalogGrid items={[makeItem()]} total={1} nextCursor={null} />,
    );
    expect(
      screen.queryByRole("link", { name: /siguiente/i }),
    ).not.toBeInTheDocument();
  });

  it("shows skeleton items when loading is true and items are empty", () => {
    const { container } = render(
      <CatalogGrid
        items={[]}
        total={0}
        nextCursor={null}
        loading={true}
      />,
    );
    // 12 skeleton cards in the grid
    const grid = container.querySelector(".grid");
    const skeletonCards = grid?.children ?? [];
    expect(skeletonCards).toHaveLength(12);
  });

  it("includes existing search params in pagination href", () => {
    render(
      <CatalogGrid
        items={[makeItem()]}
        total={13}
        nextCursor="cursor-abc"
        currentSearch="island=Tenerife&operation=SALE"
      />,
    );
    const link = screen.getByRole("link", { name: /siguiente/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("island=Tenerife"),
    );
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("cursor=cursor-abc"),
    );
  });
});
