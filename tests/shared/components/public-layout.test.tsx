import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicLayout from "@app/(public)/layout";

describe("PublicLayout (T008)", () => {
  it("renders children inside main", () => {
    render(
      <PublicLayout>
        <p>Test child content</p>
      </PublicLayout>,
    );
    expect(screen.getByText("Test child content")).toBeInTheDocument();
  });

  it("includes SkipToContent link", () => {
    render(
      <PublicLayout>
        <p>child</p>
      </PublicLayout>,
    );
    expect(
      screen.getByRole("link", { name: /saltar al contenido/i }),
    ).toBeInTheDocument();
  });

  it("includes navigation landmark", () => {
    render(
      <PublicLayout>
        <p>child</p>
      </PublicLayout>,
    );
    const navs = screen.getAllByRole("navigation");
    expect(navs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a <main> element with id='main-content'", () => {
    render(
      <PublicLayout>
        <p>child</p>
      </PublicLayout>,
    );
    const main = document.getElementById("main-content");
    expect(main).toBeInTheDocument();
    expect(main?.tagName).toBe("MAIN");
  });

  it("includes footer with role='contentinfo'", () => {
    render(
      <PublicLayout>
        <p>child</p>
      </PublicLayout>,
    );
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders Nav, main, and Footer in correct order", () => {
    const { container } = render(
      <PublicLayout>
        <p>child</p>
      </PublicLayout>,
    );

    const children = container.children;
    // The layout wraps children in its own structure
    const nav = container.querySelector("nav");
    const main = container.querySelector("main");
    const footer = container.querySelector("footer");

    // Check DOM order: nav first, then main, then footer
    expect(nav).toBeTruthy();
    expect(main).toBeTruthy();
    expect(footer).toBeTruthy();

    // navIndex is before mainIndex
    const navIndex = Array.from(children).indexOf(nav!);
    const mainIndex = Array.from(children).indexOf(main!);
    const footerIndex = Array.from(children).indexOf(footer!);

    // nav should come before main
    expect(navIndex).toBeLessThan(mainIndex);
    // main should come before footer
    expect(mainIndex).toBeLessThan(footerIndex);
  });

  it("does not contain tenant context or business logic", () => {
    // Verify no tenant-related strings in the rendered output
    render(
      <PublicLayout>
        <p>child</p>
      </PublicLayout>,
    );
    const body = document.body;
    expect(body.textContent).not.toMatch(/tenant/i);
  });
});
