import { describe, it, expect, vi } from "vitest";
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

import { EmptyState } from "@/features/catalog/components/EmptyState";

describe("EmptyState", () => {
  it("renders the eyebrow text 'CATÁLOGO'", () => {
    render(<EmptyState />);
    expect(screen.getByText("CATÁLOGO")).toBeInTheDocument();
  });

  it("renders the heading title in Fraunces", () => {
    render(<EmptyState />);
    expect(
      screen.getByRole("heading", {
        name: /todavía no hay inmuebles/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the descriptive body text", () => {
    render(<EmptyState />);
    expect(
      screen.getByText(/prueba a ajustar los filtros/i),
    ).toBeInTheDocument();
  });

  it("renders a secondary button that links to /portafolio", () => {
    render(<EmptyState />);
    const link = screen.getByRole("link", { name: /ver todas las promociones/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/portafolio");
  });

  it("has a custom message when provided", () => {
    render(
      <EmptyState message="No hay resultados para tu búsqueda." />,
    );
    expect(
      screen.getByText("No hay resultados para tu búsqueda."),
    ).toBeInTheDocument();
  });

  it("renders a custom eyebrow when provided", () => {
    render(<EmptyState eyebrow="FILTROS" />);
    expect(screen.getByText("FILTROS")).toBeInTheDocument();
  });
});
