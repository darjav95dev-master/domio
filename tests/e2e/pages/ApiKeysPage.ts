import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * ApiKeysPage — Page Object for /panel/api-keys
 *
 * @see app/(auth)/panel/api-keys/page.tsx
 * @see src/features/api-keys/components/api-keys-page-client.tsx
 */
export class ApiKeysPage extends BasePage {
  protected readonly path = "/panel/api-keys";

  // ── Header ───────────────────────────────────────────────────────────

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /api keys|claves/i, level: 1 });
  }

  // ── Key List ─────────────────────────────────────────────────────────

  get keyList(): Locator {
    return this.page.locator("ul, [role='list']").first();
  }

  get keyItems(): Locator {
    return this.keyList.locator("li, [role='listitem']");
  }

  /**
   * Find a key item by its name/description.
   */
  keyItem(name: string): Locator {
    return this.page.getByText(name).locator("..").locator("..");
  }

  // ── Actions ──────────────────────────────────────────────────────────

  get createButton(): Locator {
    return this.page.getByRole("button", { name: /crear|nueva/i });
  }

  /** The one-time display of the key value after creation */
  get keyValueDisplay(): Locator {
    return this.page.getByRole("alert").or(this.page.locator("[class*='key-value']"));
  }

  /** Revoke button */
  get revokeButton(): Locator {
    return this.page.getByRole("button", { name: /revocar/i });
  }

  // ── Status indicators ────────────────────────────────────────────────

  activeBadge(name: string): Locator {
    return this.keyItem(name).getByText(/activa|active/i);
  }

  inactiveBadge(name: string): Locator {
    return this.keyItem(name).getByText(/inactiva|inactive|revocada/i);
  }
}
