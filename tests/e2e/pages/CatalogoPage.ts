import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * CatalogoPage — Page Object for /panel/catalogo
 *
 * @see app/(auth)/panel/catalogo/page.tsx
 * @see src/features/promociones/components/catalog-filters.tsx
 * @see src/features/promociones/components/catalog-list.tsx
 */
export class CatalogoPage extends BasePage {
  protected readonly path = "/panel/catalogo";

  // ── Page Header ──────────────────────────────────────────────────────

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /catálogo/i, level: 1 });
  }

  get nuevaPromocionLink(): Locator {
    return this.page.getByRole("link", { name: /nueva promoción/i });
  }

  // ── Filters ──────────────────────────────────────────────────────────

  get filterSection(): Locator {
    return this.page.getByRole("region").or(this.page.locator("section")).filter({ hasText: /estado|kind|isla/i }).first();
  }

  /** Status filter — use exact match to avoid clash with "Estado de obra" */
  get filterStatus(): Locator {
    return this.page.getByLabel("Estado", { exact: true });
  }

  /** Kind filter (portfolio / external) */
  get filterKind(): Locator {
    return this.page.getByLabel(/tipo/i);
  }

  /** Island filter */
  get filterIsland(): Locator {
    return this.page.getByLabel(/isla/i);
  }

  /** Construction status filter */
  get filterConstructionStatus(): Locator {
    return this.page.getByLabel(/estado de obra/i);
  }

  // ── Promotion List ──────────────────────────────────────────────────

  get promotionList(): Locator {
    return this.page.locator("ul").first();
  }

  get promotionItems(): Locator {
    return this.promotionList.locator("li");
  }

  /** Status badge within a promotion item */
  statusBadge(name: string): Locator {
    return this.page.getByRole("link", { name }).locator("..").locator("span").first();
  }

  // ── Pagination ───────────────────────────────────────────────────────

  get pagination(): Locator {
    return this.page.getByRole("navigation", { name: /paginación/i });
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /**
   * Click on a promotion by its name to navigate to the edit page.
   */
  async clickPromotion(name: string): Promise<void> {
    await this.page.getByRole("link", { name }).click();
    await this.page.waitForLoadState("networkidle");
  }
}
