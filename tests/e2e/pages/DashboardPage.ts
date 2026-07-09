import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * DashboardPage — Page Object for /panel
 *
 * @see app/(auth)/panel/page.tsx
 * @see src/features/backoffice/components/dashboard-content.tsx
 */
export class DashboardPage extends BasePage {
  protected readonly path = "/panel";

  // ── Greeting ─────────────────────────────────────────────────────────

  /** "Hola, {userName}" heading */
  get greeting(): Locator {
    return this.page.getByRole("heading", { name: /hola,/i });
  }

  // ── Unread Leads Badge ───────────────────────────────────────────────

  /** The unread leads count number */
  get unreadLeadsCount(): Locator {
    return this.page.locator("[aria-live='polite']").first();
  }

  /** "Leads no leídos" text (the visible label below the count numeral) */
  get unreadLeadsLabel(): Locator {
    return this.page.locator("section[aria-labelledby='leads-heading'] span").last();
  }

  /** Empty state: "No tienes leads pendientes" */
  get noLeadsText(): Locator {
    return this.page.getByText(/no tienes leads pendientes/i);
  }

  // ── Quick Links ──────────────────────────────────────────────────────

  get quickLinksSection(): Locator {
    return this.page.getByRole("region", { name: /enlaces rápidos/i });
  }

  get catalogoLink(): Locator {
    return this.quickLinksSection.getByRole("link", { name: /catálogo/i });
  }

  get leadsLink(): Locator {
    return this.quickLinksSection.getByRole("link", { name: /leads/i });
  }

  // ── Recent Promociones ───────────────────────────────────────────────

  get recentPromocionesSection(): Locator {
    return this.page.getByRole("region", { name: /últimas promociones/i });
  }

  get recentPromocionesList(): Locator {
    return this.recentPromocionesSection.locator("li");
  }

  // ── Shortcuts ────────────────────────────────────────────────────────

  get nuevaPromocionButton(): Locator {
    return this.page.getByRole("link", { name: /nueva promoción/i });
  }

  get verBandejaButton(): Locator {
    return this.page.getByRole("link", { name: /ver bandeja/i });
  }
}
