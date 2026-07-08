import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlockCalidades } from "./BlockCalidades";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BlockCalidades", () => {
  it("renders items in a grid", () => {
    const block = {
      id: "b1",
      tenantId: "t1",
      promocionId: "p1",
      blockType: "MEMORIA_CALIDADES" as const,
      payload: {
        items: [
          { title: "Suelos", description: "Porcelánico rectificado" },
          { title: "Ventanas", description: "Climalit" },
        ],
      },
      sortOrder: 0,
      updatedBy: null,
      updatedAt: new Date(),
    };
    render(<BlockCalidades block={block} />);
    expect(screen.getByText("Suelos")).toBeInTheDocument();
    expect(screen.getByText("Porcelánico rectificado")).toBeInTheDocument();
    expect(screen.getByText("Ventanas")).toBeInTheDocument();
    expect(screen.getByText("Climalit")).toBeInTheDocument();
  });

  it("returns null when no items", () => {
    const block = {
      id: "b1",
      tenantId: "t1",
      promocionId: "p1",
      blockType: "MEMORIA_CALIDADES" as const,
      payload: { items: [] },
      sortOrder: 0,
      updatedBy: null,
      updatedAt: new Date(),
    };
    const { container } = render(<BlockCalidades block={block} />);
    expect(container.innerHTML).toBe("");
  });

  it("has correct data-block-type attribute", () => {
    const block = {
      id: "b1",
      tenantId: "t1",
      promocionId: "p1",
      blockType: "MEMORIA_CALIDADES" as const,
      payload: {
        items: [{ title: "Test", description: "Desc" }],
      },
      sortOrder: 0,
      updatedBy: null,
      updatedAt: new Date(),
    };
    render(<BlockCalidades block={block} />);
    const section = screen.getByLabelText("Memoria de calidades");
    expect(section).toHaveAttribute("data-block-type", "MEMORIA_CALIDADES");
  });
});
