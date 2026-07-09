import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * EquipoPage — Page Object for /panel/equipo
 *
 * @see app/(auth)/panel/equipo/page.tsx
 * @see src/features/team/components/team-page-client.tsx
 */
export class EquipoPage extends BasePage {
  protected readonly path = "/panel/equipo";

  // ── Header ───────────────────────────────────────────────────────────

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /equipo/i, level: 1 });
  }

  // ── User List ────────────────────────────────────────────────────────

  get userList(): Locator {
    return this.page.locator("ul, [role='list']").first();
  }

  get userItems(): Locator {
    return this.userList.locator("li, [role='listitem']");
  }

  /** Status indicator (active/inactive) */
  statusIndicator(email: string): Locator {
    return this.page.getByText(email).locator("..").locator("span").first();
  }

  // ── Create User ──────────────────────────────────────────────────────

  get createButton(): Locator {
    return this.page.getByRole("button", { name: /crear|nuevo/i });
  }

  get nameInput(): Locator {
    return this.page.getByLabel(/nombre/i);
  }

  get emailInput(): Locator {
    return this.page.getByLabel(/email|correo/i);
  }

  get roleSelect(): Locator {
    return this.page.getByLabel(/rol/i);
  }

  get saveButton(): Locator {
    return this.page.getByRole("button", { name: /guardar|crear|invitar/i });
  }
}
