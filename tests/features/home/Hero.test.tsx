import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "@/features/home/components/Hero";
import type { HeroPayload } from "@/features/home/types";

const mockData: HeroPayload = {
  claim: "Tu hogar en Canarias empieza aquí",
  lead: "Descubre las mejores propiedades en Tenerife.",
  ctaPrimary: "Ver propiedades",
  ctaSecondary: "Contactar",
  backgroundImageId: null,
  trustStats: [
    { value: "15", unit: "años", label: "de experiencia" },
    { value: "500", unit: "inmuebles", label: "gestionados" },
    { value: "10", unit: "ciudades", label: "en Tenerife" },
  ],
};

describe("Hero", () => {
  it("renders the claim heading", () => {
    render(<Hero data={mockData} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Tu hogar en Canarias empieza aquí" }),
    ).toBeInTheDocument();
  });

  it("renders the lead paragraph", () => {
    render(<Hero data={mockData} />);
    expect(screen.getByText("Descubre las mejores propiedades en Tenerife.")).toBeInTheDocument();
  });

  it("renders CTA links with correct hrefs", () => {
    render(<Hero data={mockData} />);
    const primaryLink = screen.getByRole("link", { name: "Ver propiedades" });
    expect(primaryLink).toHaveAttribute("href", "/portafolio");

    const secondaryLink = screen.getByRole("link", { name: "Contactar" });
    expect(secondaryLink).toHaveAttribute("href", "/contacto");
  });

  it("renders trust stats in the TrustCard", () => {
    render(<Hero data={mockData} />);
    // Values appear in both TrustCard and marquee, so use getAllByText and verify at least 2
    const fifteenElements = screen.getAllByText("15");
    expect(fifteenElements.length).toBeGreaterThanOrEqual(2);
    const fiveHundredElements = screen.getAllByText("500");
    expect(fiveHundredElements.length).toBeGreaterThanOrEqual(2);
    const tenElements = screen.getAllByText("10");
    expect(tenElements.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the eyebrow label", () => {
    render(<Hero data={mockData} />);
    expect(screen.getByText("Portafolio")).toBeInTheDocument();
  });

  it("has accessible landmark", () => {
    render(<Hero data={mockData} />);
    expect(
      screen.getByRole("region", { name: "Hero principal" }),
    ).toBeInTheDocument();
  });

  it("renders fallback gradient when no backgroundImageId", () => {
    const { container } = render(<Hero data={mockData} />);
    const fallback = container.querySelector(".bg-\\[linear-gradient\\(135deg\\,var\\(--color-ink-2\\)\\,var\\(--color-ink\\)\\)\\]");
    expect(fallback).toBeTruthy();
  });
});
