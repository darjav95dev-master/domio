import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * PortafolioPage — Page Object for /portafolio
 *
 * Features a FilterBar (role="search") and a grid of PropertyCard articles.
 *
 * @see app/(public)/portafolio/page.tsx
 * @see src/features/catalog/components/FilterBar.tsx
 * @see src/features/catalog/components/PropertyCard.tsx
 */
export class PortafolioPage extends BasePage {
  protected readonly path = "/portafolio";

  // ── Heading ──────────────────────────────────────────────────────────

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /próxima casa te espera/i, level: 1 });
  }

  // ── Filter Bar (role="search") ───────────────────────────────────────

  get filterBar(): Locator {
    return this.page.getByRole("search", { name: "Filtrar promociones" });
  }

  // Los filtros son dropdowns custom (botón trigger con aria-label que abre un
  // role="listbox" con role="option"), no <select> nativos. Cada getter apunta
  // al botón trigger; selectFilter() lo abre y elige la opción.

  /** Island filter trigger */
  get filterIsland(): Locator {
    return this.filterBar.getByRole("button", { name: "Isla" });
  }

  /** Property type filter trigger */
  get filterPropertyType(): Locator {
    return this.filterBar.getByRole("button", { name: "Tipo" });
  }

  /** Operation filter trigger */
  get filterOperation(): Locator {
    return this.filterBar.getByRole("button", { name: "Operación" });
  }

  /** Min price select */
  get filterPriceMin(): Locator {
    return this.filterBar.getByLabel("Precio mín.");
  }

  /** Max price select */
  get filterPriceMax(): Locator {
    return this.filterBar.getByLabel("Precio máx.");
  }

  /** Bedrooms select */
  get filterBedrooms(): Locator {
    return this.filterBar.getByLabel("Dormitorios");
  }

  /** Bathrooms select */
  get filterBathrooms(): Locator {
    return this.filterBar.getByLabel("Baños");
  }

  /** Construction status select */
  get filterConstructionStatus(): Locator {
    return this.filterBar.getByLabel("Estado de obra");
  }

  /** Clear filters button */
  get clearFiltersButton(): Locator {
    return this.filterBar.getByRole("button", { name: /limpiar filtros/i });
  }

  /** Active filter chips container */
  get activeFilterChips(): Locator {
    return this.filterBar.locator("[aria-live='polite']");
  }

  // ── Property Grid ────────────────────────────────────────────────────

  /** All property cards (article elements with aria-label) */
  get propertyCards(): Locator {
    return this.page.locator("article[aria-label]");
  }

  /** Result count text (visible in CatalogGrid) */
  get resultCount(): Locator {
    return this.page.getByText(/inmuebles? encontrados?/i);
  }

  /** Empty state message (when no properties match filters) */
  get emptyState(): Locator {
    return this.page.getByText(/no hemos encontrado/i);
  }

  // ── Pagination ───────────────────────────────────────────────────────

  /** Next page link/button */
  get nextPageButton(): Locator {
    return this.page.getByRole("link", { name: /siguiente|→/i });
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /**
   * Apply a filter by selecting an option from a filter select.
   * Waits for the URL to update (Next.js client-side navigation via router.replace).
   */
  async selectFilter(
    filterTrigger: Locator,
    optionLabel: string,
  ): Promise<void> {
    const currentUrl = this.page.url();
    // Abrir el dropdown custom y elegir la opción (role="option").
    await filterTrigger.click();
    await this.page
      .getByRole("option", { name: optionLabel, exact: true })
      .click();
    // Wait for URL to change from the current — covers both RSC and full nav
    await this.page.waitForFunction(
      (url) => window.location.href !== url,
      currentUrl,
      { timeout: 10_000 },
    );
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Click the first property card in the grid.
   * Waits for client-side navigation to `/inmuebles/[slug]`.
   */
  async clickFirstProperty(): Promise<void> {
    // Click the property name link inside the card (second <a>).
    // The first <a> is the image link; the second <a> has a ::after
    // overlay that covers the entire card and intercepts clicks.
    const card = this.propertyCards.first();
    await card.locator("h2 a").click();
    await this.page.waitForURL(/\/inmuebles\//, { timeout: 10_000 });
    await this.page.waitForLoadState("load");
  }
}
