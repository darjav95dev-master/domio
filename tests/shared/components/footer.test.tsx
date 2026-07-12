import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/shared/components/footer";

// ponytail: mock DB fetch so Footer can be rendered without a DB connection.
// Null config triggers fallback values (+34 922 000 000 / info@domio.es).
vi.mock("@/features/contact/server/get-contact-data", () => ({
  getContactPageData: vi.fn().mockResolvedValue({ contactConfig: null }),
}));

describe("Footer (T004)", () => {
  it("renders the footer element with role='contentinfo'", async () => {
    render(await Footer());
    expect(
      screen.getByRole("contentinfo"),
    ).toBeInTheDocument();
  });

  it("renders the Domio tagline in Fraunces italic", async () => {
    render(await Footer());
    const tagline = screen.getByText(/solo ven un negocio/i);
    expect(tagline).toBeInTheDocument();
    // The tagline lives in a <p> with font-display (Fraunces) italic
    const parentP = tagline.closest("p");
    expect(parentP?.className).toMatch(/font-display/);
  });

  it("renders the 'Domio' column with Sobre, Equipo, Contacto links", async () => {
    render(await Footer());
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/sobre");
    expect(hrefs).toContain("/contacto");
    // "Equipo" routes to /sobre (no dedicated public team page yet).
    expect(screen.getAllByRole("link", { name: "Equipo" })[0]).toHaveAttribute(
      "href",
      "/sobre",
    );
  });

  it("renders the 'Promociones' column pointing to the catalog (incl. island filters)", async () => {
    render(await Footer());
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/portafolio");
    expect(hrefs).toContain("/portafolio?island=Tenerife");
    expect(hrefs).toContain("/portafolio?island=Gran+Canaria");
  });

  it("links the legal pages under /legal", async () => {
    render(await Footer());
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/legal/aviso-legal");
    expect(hrefs).toContain("/legal/privacidad");
    expect(hrefs).toContain("/legal/cookies");
  });

  it("renders the contact info with email and address placeholder", async () => {
    render(await Footer());
    expect(screen.getAllByText(/info@domio\.es/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/tenerife/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders a legal row with copyright text", async () => {
    render(await Footer());
    expect(screen.getByText(/inmobiliaria en canarias/i)).toBeInTheDocument();
  });

  it("renders links with proper href attributes", async () => {
    render(await Footer());
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link).toHaveAttribute("href");
    });
  });

  it("has an accessible navigation structure", async () => {
    render(await Footer());
    // Should have at least one nav or section landmark inside footer
    const footer = screen.getByRole("contentinfo");
    expect(footer.querySelector("nav") || footer.querySelector("section"))
      .toBeTruthy();
  });

  it("applies bg-inverted styling from design tokens", async () => {
    const { container } = render(await Footer());
    const footer = container.querySelector("footer");
    expect(footer?.className).toMatch(/bg-inverted/);
  });
});
