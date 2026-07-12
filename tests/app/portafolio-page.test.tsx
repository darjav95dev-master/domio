import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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

// Mock next/navigation for FilterBar
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/portafolio",
}));

// Mock getCatalogData
const mockGetCatalogData = vi.fn();
vi.mock("@/features/catalog/server/get-catalog-data", () => ({
  getCatalogData: (...args: unknown[]) => mockGetCatalogData(...args),
}));

describe("PortafolioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the header band with title and lead text", async () => {
    mockGetCatalogData.mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const Page = (await import("@app/(public)/portafolio/page")).default;
    render(
      await Page({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /tu próxima casa te espera aquí/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/venta y alquiler de inmuebles en toda canarias/i),
    ).toBeInTheDocument();
  });

  it("renders FilterBar component", async () => {
    mockGetCatalogData.mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const Page = (await import("@app/(public)/portafolio/page")).default;
    render(
      await Page({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("search", { name: /filtrar promociones/i }),
    ).toBeInTheDocument();
  });

  it("renders CatalogGrid with items when data is returned", async () => {
    mockGetCatalogData.mockResolvedValue({
      items: [
        {
          id: "p1",
          slug: "test-promo",
          name: "Test Promo",
          kind: "portfolio",
          status: "PUBLISHED",
          operation: "SALE",
          propertyType: "piso",
          island: "Tenerife",
          municipality: "Santa Cruz",
          address: null,
          location: [28.47, -16.25],
          locationApprox: [28.47, -16.25],
          mapPrivacyMode: "EXACT",
          seoTitle: null,
          seoDescription: null,
          assignedAgentId: null,
          assignedAgentName: null,
          draftPayload: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-06-01"),
        },
      ],
      nextCursor: null,
      total: 1,
    });

    const Page = (await import("@app/(public)/portafolio/page")).default;
    render(
      await Page({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByText("1 inmueble encontrado"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Test Promo" }),
    ).toBeInTheDocument();
  });

  it("renders EmptyState when no items are returned", async () => {
    mockGetCatalogData.mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const Page = (await import("@app/(public)/portafolio/page")).default;
    render(
      await Page({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByText(/todavía no hay inmuebles/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver todas las promociones/i }),
    ).toBeInTheDocument();
  });
});
