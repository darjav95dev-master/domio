import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Nav } from "@/shared/components/nav";

const ATTR_EXPANDED = "aria-expanded";

function findMenuBtn() {
  return screen
    .getAllByRole("button")
    .find((b) => b.getAttribute(ATTR_EXPANDED) !== null);
}

function getExpanded(el: HTMLElement) {
  return el.getAttribute(ATTR_EXPANDED);
}

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.scrollY = 0;
});

describe("Nav (T006)", () => {
  it("renders the Domio logo as a link", () => {
    render(<Nav />);
    const logo = screen.getByRole("link", { name: /domio/i });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders navigation links: Portafolio, Contacto, Sobre", () => {
    render(<Nav />);
    const labels = screen.getAllByRole("link").map((l) => l.textContent?.trim());
    expect(labels).toContain("Portafolio");
    expect(labels).toContain("Contacto");
    expect(labels).toContain("Sobre");
  });

  it("renders a CTA with 'Contactar' text", () => {
    render(<Nav />);
    const links = screen.getAllByRole("link");
    expect(links.filter((l) => l.textContent === "Contactar").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the nav element with accessible role='navigation'", () => {
    render(<Nav />);
    expect(screen.getAllByRole("navigation").length).toBeGreaterThanOrEqual(1);
  });

  it("applies fixed positioning with z-index 100", () => {
    const { container } = render(<Nav />);
    const nav = container.querySelector("nav");
    expect(nav?.className).toMatch(/fixed/);
    expect(nav?.className).toMatch(/z-\[100\]/);
  });

  it("renders a hamburger button in mobile viewport", () => {
    render(<Nav />);
    expect(findMenuBtn()).toBeTruthy();
  });

  it("opens drawer when hamburger is clicked", async () => {
    const user = userEvent.setup();
    render(<Nav />);

    const menuBtn = findMenuBtn();
    expect(menuBtn).toBeTruthy();

    if (menuBtn) {
      await user.click(menuBtn);
      expect(getExpanded(menuBtn)).toBe("true");
    }
  });

  it("toggles drawer open/close on hamburger click", async () => {
    const user = userEvent.setup();
    render(<Nav />);

    const menuBtn = findMenuBtn();
    expect(menuBtn).toBeTruthy();

    if (menuBtn) {
      await user.click(menuBtn);
      expect(getExpanded(menuBtn)).toBe("true");

      await user.click(menuBtn);
      expect(getExpanded(menuBtn)).toBe("false");
    }
  });

  it("initially renders in glass mode (scrolled state) — default safe for SSR", () => {
    const { container } = render(<Nav />);
    const nav = container.querySelector("nav");
    // Nav defaults to glass/scrolled mode (isScrolled=true) for SSR safety.
    // Over-hero transparent mode only activates client-side when a dark hero is detected.
    expect(nav?.className).not.toMatch(/bg-transparent/);
    expect(nav?.className).toMatch(/backdrop-blur/);
  });

  it("renders links with proper href attributes", () => {
    render(<Nav />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/portafolio");
    expect(hrefs).toContain("/contacto");
    expect(hrefs).toContain("/sobre");
    expect(hrefs).toContain("/");
  });
});
