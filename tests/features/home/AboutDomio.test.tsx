import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutDomio } from "@/features/home/components/AboutDomio";
import type { AboutDomioPayload } from "@/features/home/types";

const ABOUT_TITLE = "Quiénes somos";

const mockData: AboutDomioPayload = {
  title: ABOUT_TITLE,
  subtitle: "Más de 15 años de experiencia.",
  imageId: null,
  imageAlt: "Equipo Domio en oficina",
  tagText: "Desde 2010",
  rows: [
    { aspect: "Experiencia", agenciaTradicional: "Variable", domio: "15+ años" },
    { aspect: "Visibilidad", agenciaTradicional: "Escaparate local", domio: "Catálogo online" },
  ],
};

describe("AboutDomio", () => {
  it("renders the section title", () => {
    render(<AboutDomio data={mockData} />);
    expect(
      screen.getByRole("heading", { level: 2, name: ABOUT_TITLE }),
    ).toBeInTheDocument();
  });

  it("renders the tag overlay", () => {
    render(<AboutDomio data={mockData} />);
    expect(screen.getByText("Desde 2010")).toBeInTheDocument();
  });

  it("renders compare table row headers", () => {
    render(<AboutDomio data={mockData} />);
    expect(screen.getByText("Experiencia")).toBeInTheDocument();
    expect(screen.getByText("Visibilidad")).toBeInTheDocument();
  });

  it("renders Domio values in the table", () => {
    render(<AboutDomio data={mockData} />);
    expect(screen.getByText("15+ años")).toBeInTheDocument();
    expect(screen.getByText("Catálogo online")).toBeInTheDocument();
  });

  it("renders 'Domio' as the third column header", () => {
    render(<AboutDomio data={mockData} />);
    const domioLabels = screen.getAllByText("Domio");
    expect(domioLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("has accessible landmark", () => {
    render(<AboutDomio data={mockData} />);
    expect(
      screen.getByRole("region", { name: ABOUT_TITLE }),
    ).toBeInTheDocument();
  });
});
