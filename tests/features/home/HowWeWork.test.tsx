import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HowWeWork } from "@/features/home/components/HowWeWork";
import type { HowWeWorkPayload } from "@/features/home/types";

const HOW_TITLE = "Cómo trabajamos";

const mockData: HowWeWorkPayload = {
  title: HOW_TITLE,
  subtitle: "Nuestro proceso transparente.",
  steps: [
    { numeral: "01", icon: "magnifying-glass", title: "Analizamos", body: "Estudiamos tus necesidades." },
    { numeral: "02", icon: "house", title: "Visitamos", body: "Te acompañamos a las visitas." },
    { numeral: "03", icon: "handshake", title: "Gestionamos", body: "Tramitamos la documentación." },
    { numeral: "04", icon: "key", title: "Entregamos", body: "Te damos las llaves." },
  ],
};

describe("HowWeWork", () => {
  it("renders the section title", () => {
    render(<HowWeWork data={mockData} />);
    expect(
      screen.getByRole("heading", { level: 2, name: HOW_TITLE }),
    ).toBeInTheDocument();
  });

  it("renders all 4 steps", () => {
    render(<HowWeWork data={mockData} />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(4);
    expect(headings[0]).toHaveTextContent("Analizamos");
    expect(headings[3]).toHaveTextContent("Entregamos");
  });

  it("renders step numbers as italic numerals", () => {
    const { container } = render(<HowWeWork data={mockData} />);
    const numerals = container.querySelectorAll(".font-serif.italic.text-\\[52px\\]");
    expect(numerals).toHaveLength(4);
  });

  it("renders step descriptions", () => {
    render(<HowWeWork data={mockData} />);
    expect(screen.getByText("Estudiamos tus necesidades.")).toBeInTheDocument();
    expect(screen.getByText("Te damos las llaves.")).toBeInTheDocument();
  });

  it("has accessible landmark", () => {
    render(<HowWeWork data={mockData} />);
    expect(
      screen.getByRole("region", { name: HOW_TITLE }),
    ).toBeInTheDocument();
  });
});
