import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * LeadsPage — Page Object for /panel/leads
 *
 * @see app/(auth)/panel/leads/page.tsx
 * @see src/features/leads/components/leads-page-content.tsx
 */
export class LeadsPage extends BasePage {
  protected readonly path = "/panel/leads";

  // ── Header ───────────────────────────────────────────────────────────

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /leads/i, level: 1 });
  }

  // ── Filters ──────────────────────────────────────────────────────────

  get filterSection(): Locator {
    return this.page.getByLabel(/filtrar|estado|source/i).first().locator("..").locator("..");
  }

  /** Status filter select */
  get filterStatus(): Locator {
    return this.page.getByLabel(/estado/i);
  }

  /** Source filter select */
  get filterSource(): Locator {
    return this.page.getByLabel(/source|origen/i);
  }

  // ── Lead List ────────────────────────────────────────────────────────

  /** The leads list container */
  get leadList(): Locator {
    return this.page.locator("ul, [role='list']").first();
  }

  /** Individual lead items */
  get leadItems(): Locator {
    return this.page.locator("[role='listitem'], li").filter({ has: this.page.locator("a") });
  }

  /** Unread indicators (bold text, dot, or specific class) */
  get unreadIndicators(): Locator {
    return this.page.getByText(/\u2022|bold|sin leer|nuevo/i);
  }

  /** Status badge within a lead item */
  leadStatusBadge(name: string): Locator {
    return this.page.getByRole("link", { name }).locator("span").filter({ hasText: /new|contacted|in_negotiation|won|lost/i });
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /**
   * Opens a lead by clicking on it.
   */
  async openLead(name: string): Promise<void> {
    await this.page.getByRole("link", { name }).click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Opens the first lead in the list.
   */
  async openFirstLead(): Promise<void> {
    await this.leadItems.first().click();
    await this.page.waitForLoadState("networkidle");
  }
}
