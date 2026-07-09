import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * ContactoPage — Page Object for /contacto
 *
 * @see app/(public)/contacto/page.tsx
 * @see src/features/contact/components/ContactFormGeneric.tsx
 */
export class ContactoPage extends BasePage {
  protected readonly path = "/contacto";

  // ── Header ───────────────────────────────────────────────────────────

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /contacto/i, level: 1 });
  }

  // ── Quick-Band (4-column contact data) ───────────────────────────────

  get quickBand(): Locator {
    return this.page.locator("section").filter({ hasText: /dirección|teléfono|email|horario/i }).first();
  }

  // ── Contact Form ─────────────────────────────────────────────────────

  get formHeading(): Locator {
    return this.page.getByRole("heading", { name: /envíanos un mensaje/i });
  }

  get nameInput(): Locator {
    return this.page.getByLabel("Nombre completo");
  }

  get emailInput(): Locator {
    return this.page.getByLabel("Correo electrónico");
  }

  get messageTextarea(): Locator {
    return this.page.getByLabel("Mensaje");
  }

  get submitButton(): Locator {
    return this.page.getByRole("button", { name: /enviar mensaje/i });
  }

  /** Success feedback after form submission */
  get successMessage(): Locator {
    return this.page.getByRole("status");
  }

  // ── Map ──────────────────────────────────────────────────────────────

  get mapContainer(): Locator {
    return this.page.locator('[class*="leaflet"]').first();
  }

  // ── Office details ───────────────────────────────────────────────────

  get contactDetails(): Locator {
    return this.page.getByText("Datos de contacto");
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /**
   * Fill the generic contact form and submit.
   */
  async submitForm(data: {
    name: string;
    email: string;
    message: string;
  }): Promise<void> {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    await this.messageTextarea.fill(data.message);
    await this.submitButton.click();
  }
}
