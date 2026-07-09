import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * LoginPage — Page Object for /panel/login
 *
 * @see app/(auth)/panel/login/page.tsx
 */
export class LoginPage extends BasePage {
  protected readonly path = "/panel/login";

  // ── Selectors ───────────────────────────────────────────────────────────
  // Based on actual UI: Input component renders <label> + <input>.
  // The form uses signIn("credentials") with email/password fields.
  // Submit button: "Iniciar sesión" (or "Iniciando sesión…" when loading).

  get emailInput(): Locator {
    return this.page.getByLabel("Email");
  }

  get passwordInput(): Locator {
    return this.page.getByLabel("Contraseña");
  }

  get submitButton(): Locator {
    return this.page.getByRole("button", { name: /iniciar sesión/i });
  }

  get errorMessage(): Locator {
    return this.page.getByRole("alert");
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Convenience: fill credentials and submit in one call.
   */
  async loginAs(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
