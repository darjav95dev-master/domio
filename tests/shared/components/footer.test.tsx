import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/shared/components/footer";

describe("Footer (T004)", () => {
  it("renders the footer element with role='contentinfo'", () => {
    render(<Footer />);
    expect(
      screen.getByRole("contentinfo"),
    ).toBeInTheDocument();
  });

  it("renders the Domio tagline in Fraunces italic", () => {
    render(<Footer />);
    const em = screen.getByText(/portafolio inmobiliario/i);
    expect(em).toBeInTheDocument();
    // The <em> is inside a <p> with font-display; <em> has not-italic
    const parentP = em.closest("p");
    expect(parentP?.className).toMatch(/font-display/);
  });

  it("renders the 'Domio' column with Sobre, Equipo, Contacto links", () => {
    render(<Footer />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/sobre");
    expect(hrefs).toContain("/equipo");
    expect(hrefs).toContain("/contacto");
  });

  it("renders the 'Portafolio' column with Catálogo, Destacados, Novedades links", () => {
    render(<Footer />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/portafolio");
    expect(hrefs).toContain("/portafolio/destacados");
    expect(hrefs).toContain("/portafolio/novedades");
  });

  it("renders the 'Legal' column with Aviso Legal, Privacidad, Cookies", () => {
    render(<Footer />);
    const links = screen.getAllByRole("link");
    const legalLinks = links.filter((l) =>
      l.getAttribute("href")?.startsWith("/legal"),
    );
    expect(legalLinks.length).toBeGreaterThanOrEqual(3);
    expect(
      legalLinks.some((l) => l.getAttribute("href") === "/legal/aviso-legal"),
    ).toBe(true);
    expect(
      legalLinks.some((l) => l.getAttribute("href") === "/legal/privacidad"),
    ).toBe(true);
    expect(
      legalLinks.some((l) => l.getAttribute("href") === "/legal/cookies"),
    ).toBe(true);
  });

  it("renders the contact info with email and address placeholder", () => {
    render(<Footer />);
    expect(screen.getByText(/info@domio\.es/i)).toBeInTheDocument();
    expect(screen.getByText(/tenerife/i)).toBeInTheDocument();
  });

  it("renders a legal row with copyright text", () => {
    render(<Footer />);
    expect(screen.getByText(/todos los derechos reservados/i)).toBeInTheDocument();
  });

  it("renders links with proper href attributes", () => {
    render(<Footer />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link).toHaveAttribute("href");
    });
  });

  it("has an accessible navigation structure", () => {
    render(<Footer />);
    // Should have at least one nav or section landmark inside footer
    const footer = screen.getByRole("contentinfo");
    expect(footer.querySelector("nav") || footer.querySelector("section"))
      .toBeTruthy();
  });

  it("applies bg-inverted styling from design tokens", () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector("footer");
    expect(footer?.className).toMatch(/bg-inverted/);
  });
});
