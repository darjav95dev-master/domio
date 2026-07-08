import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DraftIndicator } from "./draft-indicator";

describe("DraftIndicator", () => {
  it("should show 'Guardando...' when isSaving is true", () => {
    render(
      <DraftIndicator
        isSaving={true}
        lastSavedAt={null}
        error={null}
      />,
    );

    expect(screen.getByText("Guardando…")).toBeDefined();
  });

  it("should show error message when error exists", () => {
    render(
      <DraftIndicator
        isSaving={false}
        lastSavedAt={null}
        error="Network error"
      />,
    );

    expect(screen.getByText("Error al guardar")).toBeDefined();
  });

  it("should show relative timestamp when lastSavedAt is provided", () => {
    const now = new Date("2026-07-08T12:00:00Z");
    vi.setSystemTime(now);

    const savedAt = new Date("2026-07-08T11:59:30Z").toISOString();

    render(
      <DraftIndicator
        isSaving={false}
        lastSavedAt={savedAt}
        error={null}
      />,
    );

    expect(screen.getByText(/Borrador guardado hace/)).toBeDefined();
    expect(screen.getByText(/30 segundos/)).toBeDefined();
  });

  it("should have aria-live='polite' for dynamic status", () => {
    render(
      <DraftIndicator
        isSaving={false}
        lastSavedAt={new Date().toISOString()}
        error={null}
      />,
    );

    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it("should render nothing when idle with no saves and no error", () => {
    const { container } = render(
      <DraftIndicator
        isSaving={false}
        lastSavedAt={null}
        error={null}
      />,
    );

    expect(container.textContent).toBe("");
  });

  it("should apply success styles (olive) when lastSavedAt is present", () => {
    render(
      <DraftIndicator
        isSaving={false}
        lastSavedAt={new Date().toISOString()}
        error={null}
      />,
    );

    // The green dot should have olive background
    const dot = screen.getByTestId("draft-indicator-dot");
    expect(dot.className).toContain("bg-status-success-default");
  });

  it("should apply error styles (terracota) when error exists", () => {
    render(
      <DraftIndicator
        isSaving={false}
        lastSavedAt={null}
        error="Something went wrong"
      />,
    );

    const dot = screen.getByTestId("draft-indicator-dot");
    expect(dot.className).toContain("bg-status-danger-default");
  });
});
