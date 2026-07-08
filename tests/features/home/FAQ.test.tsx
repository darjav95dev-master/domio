import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FAQ } from "@/features/home/components/FAQ";
import type { FAQPayload } from "@/features/home/types";

const FAQ_TITLE = "Preguntas frecuentes";

const mockData: FAQPayload = {
  title: FAQ_TITLE,
  subtitle: "Todo lo que necesitas saber.",
  items: [
    {
      question: "¿Qué tipos de propiedad gestionan?",
      answer: "Trabajamos con todo tipo de inmuebles.",
    },
    {
      question: "¿Cuánto cuesta vender?",
      answer: "Nuestras tarifas son transparentes.",
    },
  ],
};

describe("FAQ", () => {
  it("renders the section title", () => {
    render(<FAQ data={mockData} />);
    expect(
      screen.getByRole("heading", { level: 2, name: FAQ_TITLE }),
    ).toBeInTheDocument();
  });

  it("renders all questions", () => {
    render(<FAQ data={mockData} />);
    expect(
      screen.getByText("¿Qué tipos de propiedad gestionan?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("¿Cuánto cuesta vender?"),
    ).toBeInTheDocument();
  });

  it("renders accordion buttons with aria-expanded", () => {
    render(<FAQ data={mockData} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute("aria-expanded");
    });
  });

  it("has accessible region", () => {
    render(<FAQ data={mockData} />);
    // Both <section> and the accordion <div> have the same label; use getAllByRole
    const regions = screen.getAllByRole("region", { name: FAQ_TITLE });
    expect(regions.length).toBeGreaterThanOrEqual(1);
    // The <section> has class py-section-lg
    const section = regions.find((r) => r.tagName === "SECTION");
    expect(section).toBeTruthy();
  });
});
