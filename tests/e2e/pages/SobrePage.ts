import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * SobrePage — Page Object for /sobre
 *
 * @see app/(public)/sobre/page.tsx
 */
export class SobrePage extends BasePage {
  protected readonly path = "/sobre";

  // ── Hero ─────────────────────────────────────────────────────────────

  /** "Sobre Domio" heading */
  get heading(): Locator {
    return this.page.getByRole("heading", { name: /sobre domio/i, level: 1 });
  }

  /** Eyebrow text: "Domio" */
  get eyebrow(): Locator {
    return this.page.getByText("Domio").first();
  }

  /** Lead paragraph */
  get lead(): Locator {
    return this.page.getByText(/conoce|somos/i).first();
  }

  // ── Editorial Content ─────────────────────────────────────────────────

  /** Editorial content paragraphs */
  get contentParagraphs(): Locator {
    return this.page.locator("section").last().locator("p");
  }

  /** Signature quote */
  get signature(): Locator {
    return this.page.getByText(/cada propiedad cuenta una historia/i);
  }

  /** Placeholder message when content is not published */
  get emptyStateMessage(): Locator {
    return this.page.getByText(/equipo editorial aún no ha publicado/i);
  }

  // ── Photography ──────────────────────────────────────────────────────

  /** Decorative photograph element */
  get photograph(): Locator {
    return this.page.locator("[aria-hidden='true']").last();
  }
}
