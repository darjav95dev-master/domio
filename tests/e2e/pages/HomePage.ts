import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * HomePage — Page Object for /
 *
 * Sections (from app/(public)/page.tsx):
 * - Hero (section aria-label="Hero principal")
 * - HowWeWork
 * - AboutDomio
 * - FeaturedPortfolio (section aria-labelledby="portfolio-title")
 * - Trust (section aria-labelledby="trust-title")
 * - CTA
 * - FAQ
 * - Footer (role="contentinfo")
 *
 * @see app/(public)/page.tsx
 */
export class HomePage extends BasePage {
  protected readonly path = "/";

  // ── Hero section ──────────────────────────────────────────────────────

  get heroSection(): Locator {
    return this.page.getByRole("region", { name: "Hero principal" });
  }

  /**
   * The claim heading (<h1>) in the Hero section.
   * From seed: "Tu hogar en Canarias empieza aquí"
   */
  get heroClaim(): Locator {
    return this.heroSection.getByRole("heading", { level: 1 });
  }

  /** Primary CTA link in hero: "Ver propiedades" */
  get heroCtaPrimary(): Locator {
    return this.heroSection.getByRole("link", { name: /ver propiedades/i });
  }

  /** Secondary CTA link in hero: "Contactar" */
  get heroCtaSecondary(): Locator {
    return this.heroSection.getByRole("link", { name: /contactar/i });
  }

  // ── Featured Portfolio section ────────────────────────────────────────

  get featuredPortfolioSection(): Locator {
    return this.page.getByRole("region", { name: /promociones destacadas/i });
  }

  get featuredPortfolioCards(): Locator {
    return this.featuredPortfolioSection.locator("article");
  }

  // ── Trust section ─────────────────────────────────────────────────────

  get trustSection(): Locator {
    return this.page.getByRole("region", { name: /confianza/i });
  }

  // ── FAQ section ───────────────────────────────────────────────────────

  /** FAQ accordion — uses heading "Preguntas frecuentes" */
  get faqHeading(): Locator {
    return this.page.getByRole("heading", { name: /preguntas frecuentes/i });
  }

  // ── Navigation ────────────────────────────────────────────────────────

  get nav(): Locator {
    return this.page.getByRole("navigation", { name: "Navegación principal" });
  }

  get navPortafolioLink(): Locator {
    return this.nav.getByRole("link", { name: "Promociones" });
  }

  get navContactoLink(): Locator {
    return this.nav.getByRole("link", { name: "Contacto" });
  }

  get navSobreLink(): Locator {
    return this.nav.getByRole("link", { name: "Sobre" });
  }

  // ── Footer ────────────────────────────────────────────────────────────

  get footer(): Locator {
    return this.page.getByRole("contentinfo");
  }

  /** Footer phone number link */
  get footerPhone(): Locator {
    return this.footer.getByRole("link", { name: /\+34/ });
  }

  /** Footer email link */
  get footerEmail(): Locator {
    return this.footer.getByRole("link", { name: /@/ });
  }

  // ── Page heading ──────────────────────────────────────────────────────

  /** The main page title (from layout metadata, rendered in <title>) */
  get pageTitle(): Promise<string> {
    return this.page.title();
  }
}
