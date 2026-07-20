import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * InmuebleDetailPage — Page Object for /inmuebles/[slug]
 *
 * @see app/(public)/inmuebles/[slug]/page.tsx
 */
export class InmuebleDetailPage extends BasePage {
  protected readonly path = "/inmuebles";

  // La ficha monta un mapa (maplibre) que pide tiles de forma continua, así que
  // la red NUNCA reposa y "networkidle" hace timeout. Sobreescribimos la carga
  // para usar "load" SOLO en la ficha (el resto de páginas mantiene networkidle).

  /**
   * Navigate to a specific property by slug.
   */
  async gotoSlug(slug: string): Promise<ReturnType<BasePage["goto"]>> {
    return this.page.goto(`/inmuebles/${slug}`, { waitUntil: "load" });
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("load");
  }

  // ── Hero / Gallery ───────────────────────────────────────────────────

  get photoHero(): Locator {
    return this.page.locator("section").first();
  }

  // ── Property Info ────────────────────────────────────────────────────

  /** Property name (shown in the sidebar sticky card) */
  get propertyName(): Locator {
    return this.page.getByText(/residencial|apartamentos|villas|pisos|ático|casa|local|oficina/i).first();
  }

  /**
   * Construction status badge rendered in the hero section.
   * Shows the spanish label: "Sobre plano", "En construcción", "Entrega inmediata".
   */
  get constructionStatusBadge(): Locator {
    const hero = this.page.getByRole("region", { name: /Detalle de /i });
    return hero.getByText(/sobre plano|en construcción|entrega inmediata/i);
  }

  // ── Info Bar (4-column metrics) ──────────────────────────────────────

  get infoBar(): Locator {
    return this.page.locator("section").filter({ hasText: /precio|superficie|dormitorios|entrega/i }).first();
  }

  // ── Editorial Blocks ─────────────────────────────────────────────────

  get editorialBlocks(): Locator {
    return this.page.locator("section").filter({ hasText: /descripción|calidades|comunes|ubicación|plazos/i });
  }

  // ── Typology Table ───────────────────────────────────────────────────

  get typologySection(): Locator {
    return this.page.getByRole("region").filter({ hasText: "Tipologías" }).or(
      this.page.getByRole("heading", { name: /tipos de vivienda/i }).locator("..").locator(".."),
    );
  }

  get typologyTable(): Locator {
    return this.page.locator("table").first();
  }

  // ── Map ──────────────────────────────────────────────────────────────

  get mapSection(): Locator {
    return this.page.getByRole("heading", { name: /mapa/i }).locator("..").locator("..");
  }

  get mapContainer(): Locator {
    return this.page.getByTestId("map-promocion");
  }

  // ── Contact Form ─────────────────────────────────────────────────────

  /** Contact form section heading */
  get contactFormHeading(): Locator {
    return this.page.getByRole("heading", { name: /solicitar información/i });
  }

  get contactNameInput(): Locator {
    return this.page.getByLabel("Nombre completo");
  }

  get contactEmailInput(): Locator {
    return this.page.getByLabel("Email");
  }

  get contactPhoneInput(): Locator {
    return this.page.getByLabel(/teléfono/i);
  }

  get contactMessageTextarea(): Locator {
    return this.page.getByLabel("Mensaje");
  }

  get contactConsentCheckbox(): Locator {
    return this.page.getByRole("checkbox", { name: /política de privacidad/i });
  }

  get contactSubmitButton(): Locator {
    return this.page.getByRole("button", { name: /solicitar información/i });
  }

  /** Success message after form submission */
  get contactSuccessMessage(): Locator {
    return this.page.getByRole("status");
  }

  // ── WhatsApp Button ──────────────────────────────────────────────────

  get whatsappButton(): Locator {
    return this.page.getByRole("link", { name: /whatsapp/i });
  }

  // ── Share Button ─────────────────────────────────────────────────────

  get shareButton(): Locator {
    return this.page.getByRole("button", { name: /compartir/i });
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /**
   * Fill the contact form and submit.
   */
  async submitContactForm(data: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    acceptConsent?: boolean;
  }): Promise<void> {
    await this.contactNameInput.fill(data.name);
    await this.contactEmailInput.fill(data.email);
    if (data.phone) {
      await this.contactPhoneInput.fill(data.phone);
    }
    await this.contactMessageTextarea.fill(data.message);
    if (data.acceptConsent !== false) {
      await this.contactConsentCheckbox.check();
    }
    await this.contactSubmitButton.click();
  }
}
