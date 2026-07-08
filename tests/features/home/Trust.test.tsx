import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Trust } from "@/features/home/components/Trust";
import type { TrustPayload } from "@/features/home/types";

const mockData: TrustPayload = {
  title: "Confianza",
  subtitle: "Los números hablan.",
  metrics: [
    { value: "15", unit: "años", label: "de experiencia" },
    { value: "500", unit: "+", label: "inmuebles gestionados" },
  ],
  testimonios: [
    {
      quote: "Domio hizo que comprar fuera sencillo.",
      author: "María y Carlos",
      role: "Compradores, Adeje",
    },
    {
      quote: "Profesionales y cercanos.",
      author: "Ana García",
      role: "Vendedora, Santa Cruz",
    },
  ],
};

describe("Trust", () => {
  it("renders section title", () => {
    render(<Trust data={mockData} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Confianza" }),
    ).toBeInTheDocument();
  });

  it("renders metric numerals", () => {
    render(<Trust data={mockData} />);
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("renders testimonials with quotes", () => {
    render(<Trust data={mockData} />);
    expect(
      screen.getByText("Domio hizo que comprar fuera sencillo."),
    ).toBeInTheDocument();
  });

  it("renders testimonial authors", () => {
    render(<Trust data={mockData} />);
    expect(screen.getByText("María y Carlos")).toBeInTheDocument();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
  });

  it("has accessible landmark", () => {
    render(<Trust data={mockData} />);
    expect(
      screen.getByRole("region", { name: "Confianza" }),
    ).toBeInTheDocument();
  });
});
