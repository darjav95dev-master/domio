import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Button } from "@/shared/components/button";

const GLOBALS_CSS = resolve(__dirname, "../../../app/globals.css");

describe("Button (T006)", () => {
  it("renders the four design variants", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(
      screen.getByRole("button", { name: "Primary" }),
    ).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(
      screen.getByRole("button", { name: "Secondary" }),
    ).toBeInTheDocument();

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button", { name: "Ghost" })).toBeInTheDocument();

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
  });

  it("keeps focus-visible ring 2px terracota + offset 3px from design tokens", () => {
    const { container } = render(<Button variant="primary">Focusable</Button>);
    const button = container.querySelector("button");

    expect(button).toBeInTheDocument();
    expect(button).not.toHaveClass("outline-none");
    expect(button).toHaveAttribute("type", "button");

    const css = readFileSync(GLOBALS_CSS, "utf-8");
    expect(css).toContain("--focus-ring: #c75d3f");
    expect(css).toMatch(
      /:focus-visible\s*\{[^}]*outline:\s*2px\s+solid\s+var\(--focus-ring\)/,
    );
    expect(css).toMatch(/outline-offset:\s*3px/);
  });

  it("reflects disabled state", () => {
    render(<Button variant="primary" disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });
});
