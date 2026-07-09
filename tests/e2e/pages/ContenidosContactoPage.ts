import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * ContenidosContactoPage — Page Object for /panel/contenidos/contacto
 *
 * @see app/(auth)/panel/contenidos/contacto/page.tsx
 * @see src/features/contenidos/components/ContactConfigForm.tsx
 */
export class ContenidosContactoPage extends BasePage {
  protected readonly path = "/panel/contenidos/contacto";

  // ── Header ───────────────────────────────────────────────────────────

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /configuración de contacto/i, level: 1 });
  }

  get backLink(): Locator {
    return this.page.getByRole("link", { name: /volver a contenidos/i });
  }

  // ── Form ─────────────────────────────────────────────────────────────

  get form(): Locator {
    return this.page.locator("form").first();
  }

  get phoneInput(): Locator {
    return this.page.getByLabel("Teléfono");
  }

  get emailInput(): Locator {
    return this.page.getByLabel("Email");
  }

  get addressInput(): Locator {
    return this.page.getByLabel("Dirección");
  }

  get scheduleInput(): Locator {
    return this.page.getByLabel("Horario");
  }

  get whatsappNumberInput(): Locator {
    return this.page.getByLabel("Número de WhatsApp");
  }

  get whatsappMessageInput(): Locator {
    return this.page.getByLabel("Mensaje predefinido de WhatsApp");
  }

  get saveButton(): Locator {
    return this.page.getByRole("button", { name: /guardar configuración/i });
  }

  /** Toast notification after save */
  get toastMessage(): Locator {
    return this.page.getByRole("alert");
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /**
   * Fill the contact config form with provided data and save.
   */
  async updateConfig(config: {
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    whatsappNumber?: string;
    whatsappMessage?: string;
  }): Promise<void> {
    if (config.phone !== undefined) await this.phoneInput.fill(config.phone);
    if (config.email !== undefined) await this.emailInput.fill(config.email);
    if (config.address !== undefined) await this.addressInput.fill(config.address);
    if (config.hours !== undefined) await this.scheduleInput.fill(config.hours);
    if (config.whatsappNumber !== undefined) await this.whatsappNumberInput.fill(config.whatsappNumber);
    if (config.whatsappMessage !== undefined) await this.whatsappMessageInput.fill(config.whatsappMessage);
    await this.saveButton.click();
  }
}
