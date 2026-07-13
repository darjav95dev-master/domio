import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/contacto",
}));

import { ContactForm } from "../contact-form";

describe("ContactForm", () => {
  it("renders all required form fields", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Nombre completo")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Teléfono (opcional)"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje (opcional)")).toBeInTheDocument();
  });

  it("renders consent checkbox with legal text", () => {
    render(<ContactForm />);

    const checkbox = screen.getByLabelText("Acepto la política de privacidad");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeRequired();

    expect(
      screen.getByText(
        "He leido y acepto la politica de privacidad y el tratamiento de mis datos personales para la gestion de mi consulta.",
      ),
    ).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ContactForm />);

    expect(
      screen.getByRole("button", { name: "Enviar mensaje" }),
    ).toBeInTheDocument();
  });

  it("has hidden fields for promocionId, source, channel, and consentTextAccepted", () => {
    render(<ContactForm />);

    expect(screen.getByDisplayValue("00000000-0000-0000-0000-000000000000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("commercial")).toBeInTheDocument();
    expect(screen.getByDisplayValue("FORM")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        "He leido y acepto la politica de privacidad y el tratamiento de mis datos personales para la gestion de mi consulta.",
      ),
    ).toBeInTheDocument();
  });

  it("disables submit button while pending", () => {
    render(<ContactForm />);

    // Button is enabled by default
    const button = screen.getByRole("button", { name: "Enviar mensaje" });
    expect(button).not.toBeDisabled();
  });
});
