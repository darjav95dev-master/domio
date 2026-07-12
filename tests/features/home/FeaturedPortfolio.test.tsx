import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturedPortfolio } from "@/features/home/components/FeaturedPortfolio";
import type { Promocion } from "@/infrastructure/db/schema/promociones";

const mockPromociones: Promocion[] = [
  {
    id: "1",
    tenantId: "t1",
    slug: "residencial-las-americas",
    name: "Residencial Las Américas",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "piso",
    constructionStatus: "ON_PLAN",
    island: "Tenerife",
    municipality: "Adeje",
    address: "Av. de las Américas, 15",
    location: [-16.724, 28.1246] as [number, number],
    locationApprox: [-16.719, 28.1196] as [number, number],
    mapPrivacyMode: "AREA",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    draftPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    tenantId: "t1",
    slug: "apartamentos-costa-adeje",
    name: "Apartamentos Costa Adeje",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "piso",
    constructionStatus: "IN_CONSTRUCTION",
    island: "Tenerife",
    municipality: "Adeje",
    address: "Calle la Arena, 32",
    location: [-16.729, 28.119] as [number, number],
    locationApprox: [-16.724, 28.114] as [number, number],
    mapPrivacyMode: "EXACT",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    draftPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    tenantId: "t1",
    slug: "villas-la-laguna",
    name: "Villas La Laguna",
    kind: "portfolio",
    status: "PUBLISHED",
    operation: "SALE",
    propertyType: "chalet",
    constructionStatus: "READY",
    island: "Tenerife",
    municipality: "La Laguna",
    address: "Camino de la Villa, 8",
    location: [-16.3155, 28.4872] as [number, number],
    locationApprox: [-16.3105, 28.4822] as [number, number],
    mapPrivacyMode: "EXACT",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
    draftPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("FeaturedPortfolio", () => {
  it("renders section title", () => {
    render(<FeaturedPortfolio promociones={mockPromociones} />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Casas que están esperando a alguien como tú.",
      }),
    ).toBeInTheDocument();
  });

  it("renders 3 property cards", () => {
    render(<FeaturedPortfolio promociones={mockPromociones} />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(3);
  });

  it("renders property names", () => {
    render(<FeaturedPortfolio promociones={mockPromociones} />);
    expect(screen.getByText("Residencial Las Américas")).toBeInTheDocument();
    expect(screen.getByText("Villas La Laguna")).toBeInTheDocument();
  });

  it("renders municipality and island", () => {
    render(<FeaturedPortfolio promociones={mockPromociones} />);
    // Two properties in Adeje, so getAllByText
    const adejeElements = screen.getAllByText("Adeje, Tenerife");
    expect(adejeElements.length).toBe(2);
    expect(screen.getByText("La Laguna, Tenerife")).toBeInTheDocument();
  });

  it("renders links to property detail pages", () => {
    render(<FeaturedPortfolio promociones={mockPromociones} />);
    const link = screen.getByRole("link", { name: /Ver detalles de Residencial Las Américas/ });
    expect(link).toHaveAttribute("href", "/inmuebles/residencial-las-americas");
  });

  it("renders empty state when no promociones", () => {
    render(<FeaturedPortfolio promociones={[]} />);
    expect(
      screen.getByText("Próximamente estaremos añadiendo nuestras propiedades destacadas."),
    ).toBeInTheDocument();
  });
});
