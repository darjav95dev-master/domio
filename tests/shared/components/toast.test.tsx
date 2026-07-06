import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toast } from "@/shared/components/toast";

describe("Toast (T009)", () => {
  it("has role alert and aria-live polite", () => {
    render(<Toast variant="info" title="Aviso">Mensaje</Toast>);
    const toast = screen.getByRole("alert");

    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  it("renders four semantic variants", () => {
    const { rerender } = render(
      <Toast variant="success" title="Ok">Success</Toast>,
    );
    expect(screen.getByRole("alert")).toHaveClass("bg-status-success-subtle");

    rerender(<Toast variant="warning" title="Cuidado">Warning</Toast>);
    expect(screen.getByRole("alert")).toHaveClass("bg-status-warning-subtle");

    rerender(<Toast variant="error" title="Error">Error</Toast>);
    expect(screen.getByRole("alert")).toHaveClass("bg-status-danger-subtle");

    rerender(<Toast variant="info" title="Info">Info</Toast>);
    expect(screen.getByRole("alert")).toHaveClass("bg-status-info-subtle");
  });
});
