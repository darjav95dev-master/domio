import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PropertyCard } from "@/features/catalog/components/PropertyCard";
import type { CatalogItem } from "@/features/catalog/components/PropertyCard";

const baseItem: CatalogItem = {
  id: "promo-1",
  slug: "residencial-mar",
  name: "Residencial Mar",
  kind: "portfolio",
  status: "PUBLISHED",
  operation: "SALE",
  propertyType: "piso",
  island: "Tenerife",
  municipality: "Santa Cruz",
  address: "Calle del Mar 12",
  price: 250000,
  currency: "EUR",
  imageUrl: null,
  bedrooms: 3,
  bathrooms: 2,
  location: [28.47, -16.25],
  locationApprox: [28.47, -16.25],
  mapPrivacyMode: "EXACT",
  seoTitle: null,
  seoDescription: null,
  constructionStatus: "READY",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-06-01"),
};

describe("PropertyCard", () => {
  it("renders as an article with aria-label combining name, location and price", () => {
    render(<PropertyCard item={baseItem} />);
    const article = screen.getByRole("article");
    expect(article).toBeInTheDocument();
    expect(article).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Residencial Mar"),
    );
  });

  it("renders the property name as a heading", () => {
    render(<PropertyCard item={baseItem} />);
    expect(
      screen.getByRole("heading", { name: "Residencial Mar" }),
    ).toBeInTheDocument();
  });

  it("renders the formatted price with € symbol", () => {
    render(<PropertyCard item={baseItem} />);
    expect(screen.getByText(/250\.000\s*€/)).toBeInTheDocument();
  });

  it("renders the location (municipality, island)", () => {
    render(<PropertyCard item={baseItem} />);
    expect(screen.getByText(/Santa Cruz/)).toBeInTheDocument();
    expect(screen.getByText(/Tenerife/)).toBeInTheDocument();
  });

  it("renders a link to /inmuebles/[slug]", () => {
    render(<PropertyCard item={baseItem} />);
    const links = screen.getAllByRole("link");
    // Every link inside the card should point to the property detail
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/inmuebles/residencial-mar");
    }
  });

  it("renders LIVE badge when status is PUBLISHED and property is new", () => {
    const recentItem = {
      ...baseItem,
      createdAt: new Date(),
      name: "Nuevo Edificio",
    };
    render(<PropertyCard item={recentItem} />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("renders HOT badge for SALE properties with price ≥ 300000", () => {
    const hotItem = { ...baseItem, price: 500000, name: "Ático Premium" };
    render(<PropertyCard item={hotItem} />);
    expect(screen.getByText("HOT")).toBeInTheDocument();
  });

  it("renders RENT label for rental properties", () => {
    const rentItem = { ...baseItem, operation: "RENT", name: "Alquiler Playa" };
    render(<PropertyCard item={rentItem} />);
    expect(screen.getByText("ALQUILER")).toBeInTheDocument();
  });

  it("renders SALE label for sale properties", () => {
    render(<PropertyCard item={baseItem} />);
    expect(screen.getByText("VENTA")).toBeInTheDocument();
  });

  it("does not render HOT badge for non-SALE operations", () => {
    const rentItem = { ...baseItem, operation: "RENT", price: 500000 };
    render(<PropertyCard item={rentItem} />);
    expect(screen.queryByText("HOT")).not.toBeInTheDocument();
  });

  it("renders bedrooms and bathrooms when available", () => {
    render(<PropertyCard item={baseItem} />);
    expect(screen.getByText(/3\s*dorm/)).toBeInTheDocument();
    expect(screen.getByText(/2\s*bañ/)).toBeInTheDocument();
  });

  it("renders the media image with fallback gradient when no image", () => {
    render(<PropertyCard item={baseItem} />);
    // The fallback renders a div with role="img"
    const img = screen.getByRole("img", { name: /Residencial Mar/ });
    expect(img).toBeInTheDocument();
  });

  it("applies hover lift classes", () => {
    const { container } = render(<PropertyCard item={baseItem} />);
    const article = container.querySelector("article");
    // The hover classes should be in the card's className
    expect(article!.className).toContain("transition-all");
  });
});
