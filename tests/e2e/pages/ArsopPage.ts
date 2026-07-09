import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * ArsopPage — Page Object for /panel/arsop
 *
 * Currently a placeholder page. Will be expanded when ARSOP feature is implemented.
 *
 * @see app/(auth)/panel/arsop/page.tsx
 */
export class ArsopPage extends BasePage {
  protected readonly path = "/panel/arsop";

  // ── Header ───────────────────────────────────────────────────────────

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /arsop/i, level: 1 });
  }

  /** Placeholder text indicating ARSOP is not yet implemented */
  get placeholderText(): Locator {
    return this.page.getByText(/sección será implementada/i);
  }

  // ── Future elements (for when ARSOP is implemented) ──────────────────

  get requestList(): Locator {
    return this.page.locator("ul, [role='list']").first();
  }

  get exportButton(): Locator {
    return this.page.getByRole("button", { name: /exportar/i });
  }

  get deleteButton(): Locator {
    return this.page.getByRole("button", { name: /eliminar|borrar/i });
  }

  get confirmationDialog(): Locator {
    return this.page.getByRole("dialog");
  }

  get confirmDeleteButton(): Locator {
    return this.confirmationDialog.getByRole("button", { name: /confirmar|eliminar|borrar/i });
  }

  get cancelButton(): Locator {
    return this.confirmationDialog.getByRole("button", { name: /cancelar/i });
  }
}
