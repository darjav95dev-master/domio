import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LeadStatusBadge } from "../lead-status-badge";

describe("LeadStatusBadge", () => {
  it("renders NEW status with correct label and styling", () => {
    render(<LeadStatusBadge status="NEW" />);

    const badge = screen.getByText("Nuevo");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-status-info-subtle");
    expect(badge.className).toContain("text-status-info-default");
  });

  it("renders CONTACTED status with correct label", () => {
    render(<LeadStatusBadge status="CONTACTED" />);

    expect(screen.getByText("Contactado")).toBeInTheDocument();
  });

  it("renders IN_NEGOTIATION status with correct label", () => {
    render(<LeadStatusBadge status="IN_NEGOTIATION" />);

    expect(screen.getByText("En negociación")).toBeInTheDocument();
  });

  it("renders WON status with correct label", () => {
    render(<LeadStatusBadge status="WON" />);

    expect(screen.getByText("Ganado")).toBeInTheDocument();
  });

  it("renders LOST status with correct label", () => {
    render(<LeadStatusBadge status="LOST" />);

    expect(screen.getByText("Perdido")).toBeInTheDocument();
  });

  it("renders with aria-label for accessibility", () => {
    render(<LeadStatusBadge status="NEW" />);

    expect(screen.getByLabelText("Estado: Nuevo")).toBeInTheDocument();
  });
});
