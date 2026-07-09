import { type Page, expect } from "@playwright/test";

/**
 * BasePage — abstract base for all Page Objects.
 *
 * Provides common navigation, load-waiting, and title-assertion helpers.
 * Every Page Object in this project extends BasePage.
 *
 * Selector discipline: getByRole > getByTestId > getByText.
 *
 * @see constitution.md §2 — Page Object Model
 */
export abstract class BasePage {
  /** The Playwright Page instance driving the test. */
  protected readonly page: Page;

  /**
   * Relative path used by `goto()` from the base URL.
   * Override in subclasses (e.g. "/portafolio", "/panel/login").
   */
  protected abstract readonly path: string;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the page's path.
   * Waits for the network to settle (networkidle).
   * Returns the response for status checks.
   */
  async goto(subpath?: string): Promise<ReturnType<Page["goto"]>> {
    const target = subpath ?? this.path;
    return this.page.goto(target, { waitUntil: "networkidle" });
  }

  /**
   * Navigate to an arbitrary path (for cross-page jumps).
   */
  async gotoPath(path: string): Promise<ReturnType<Page["goto"]>> {
    return this.page.goto(path, { waitUntil: "networkidle" });
  }

  /**
   * Wait for the page to be fully loaded:
   * - DOM content loaded
   * - Network idle
   * - No spinners/loaders visible (pragmatic timeout)
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Assert the page title contains the expected text.
   */
  async expectTitle(text: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(text);
  }

  /**
   * Get the current URL pathname (without origin or query string).
   */
  get pathname(): string {
    return this.page.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  }

  /**
   * Get the current URL search params.
   */
  get searchParams(): URLSearchParams {
    const url = new URL(this.page.url());
    return url.searchParams;
  }
}
