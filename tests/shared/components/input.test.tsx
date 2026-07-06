import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "@/shared/components/input";

describe("Input / FormField (T007)", () => {
  it("associates label with input via htmlFor", () => {
    render(<Input id="email" label="Correo electrónico" />);

    const label = screen.getByText("Correo electrónico");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", "email");
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "email");
  });

  it("exposes error state via aria-describedby", () => {
    render(
      <Input
        id="email"
        label="Correo"
        error="El correo es obligatorio"
      />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByText("El correo es obligatorio")).toHaveAttribute(
      "id",
      "email-error",
    );
  });

  it("uses semantic focus styles", () => {
    const { container } = render(<Input id="name" label="Nombre" />);
    const input = container.querySelector("input");

    expect(input).toHaveClass("focus:border-accent-default");
  });

  it("reflects disabled state", () => {
    render(<Input id="name" label="Nombre" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
