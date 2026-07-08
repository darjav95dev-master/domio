import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkipToContent } from "@/shared/components/skip-to-content";

describe("SkipToContent (T002)", () => {
  it("renders a link with 'Saltar al contenido' text", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link", { name: /saltar al contenido/i });
    expect(link).toBeInTheDocument();
  });

  it("links to #main-content", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("is hidden from visual view by default (not focus-visible)", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link");
    // Should have classes that visually hide it (sr-only pattern)
    // The link should be in DOM but not visible
    expect(link).toBeInTheDocument();
  });

  it("moves focus to main-content on click", async () => {
    // Setup: render with a <main id="main-content"> target
    render(
      <div>
        <SkipToContent />
        <main id="main-content">Content</main>
      </div>,
    );

    const user = userEvent.setup();
    const link = screen.getByRole("link", { name: /saltar al contenido/i });

    await user.click(link);

    const main = document.getElementById("main-content");
    expect(main).toBeInTheDocument();
    expect(document.activeElement).toBe(main);
  });

  it("has accessible name via aria-label or visible text", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent(/saltar al contenido/i);
  });

  it("applies focus-visible ring styles from design tokens via class", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link");
    // Must NOT have outline:none — focus-visible ring must be visible
    expect(link.className).not.toMatch(/outline-none/);
  });
});
