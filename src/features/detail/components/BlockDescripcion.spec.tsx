import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlockDescripcion } from "./BlockDescripcion";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BlockDescripcion", () => {
  it("renders HTML text content", () => {
    const block = {
      id: "b1",
      tenantId: "t1",
      promocionId: "p1",
      blockType: "DESCRIPCION_GENERAL" as const,
      payload: { text: "<p>Una descripción <strong>importante</strong></p>" },
      sortOrder: 0,
      updatedBy: null,
      updatedAt: new Date(),
    };
    render(<BlockDescripcion block={block} />);
    expect(screen.getByText("Una descripción")).toBeInTheDocument();
    expect(screen.getByText("importante")).toBeInTheDocument();
  });

  it("returns null when no text payload", () => {
    const block = {
      id: "b1",
      tenantId: "t1",
      promocionId: "p1",
      blockType: "DESCRIPCION_GENERAL" as const,
      payload: {},
      sortOrder: 0,
      updatedBy: null,
      updatedAt: new Date(),
    };
    const { container } = render(<BlockDescripcion block={block} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders an empty div for empty text", () => {
    const block = {
      id: "b1",
      tenantId: "t1",
      promocionId: "p1",
      blockType: "DESCRIPCION_GENERAL" as const,
      payload: { text: "" },
      sortOrder: 0,
      updatedBy: null,
      updatedAt: new Date(),
    };
    const { container } = render(<BlockDescripcion block={block} />);
    expect(container.innerHTML).toBe("");
  });

  it("has correct data-block-type attribute", () => {
    const block = {
      id: "b1",
      tenantId: "t1",
      promocionId: "p1",
      blockType: "DESCRIPCION_GENERAL" as const,
      payload: { text: "<p>Test</p>" },
      sortOrder: 0,
      updatedBy: null,
      updatedAt: new Date(),
    };
    render(<BlockDescripcion block={block} />);
    const section = screen.getByLabelText("Descripción general");
    expect(section).toHaveAttribute("data-block-type", "DESCRIPCION_GENERAL");
  });
});
