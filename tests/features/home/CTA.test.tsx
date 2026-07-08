import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CTA } from "@/features/home/components/CTA";
import type { CTAPayload } from "@/features/home/types";

const mockData: CTAPayload = {
  title: "¿Listo para encontrar tu hogar ideal?",
  body: "Déjanos ayudarte.",
  ctaLabel: "Solicitar visita",
  ctaHref: "/contacto",
  backgroundImageId: null,
};

describe("CTA", () => {
  it("renders the heading", () => {
    render(<CTA data={mockData} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "¿Listo para encontrar tu hogar ideal?" }),
    ).toBeInTheDocument();
  });

  it("renders the body text", () => {
    render(<CTA data={mockData} />);
    expect(screen.getByText("Déjanos ayudarte.")).toBeInTheDocument();
  });

  it("renders the CTA link with correct href", () => {
    render(<CTA data={mockData} />);
    const link = screen.getByRole("link", { name: "Solicitar visita" });
    expect(link).toHaveAttribute("href", "/contacto");
  });

  it("has accessible landmark", () => {
    render(<CTA data={mockData} />);
    expect(
      screen.getByRole("region", { name: "Llamada a la acción" }),
    ).toBeInTheDocument();
  });
});
