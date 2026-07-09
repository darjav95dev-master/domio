import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * LeadDetailPage — Page Object for /panel/leads/[id]
 *
 * @see app/(auth)/panel/leads/[id]/page.tsx
 * @see src/features/leads/components/lead-detail.tsx
 */
export class LeadDetailPage extends BasePage {
  protected readonly path = "/panel/leads";

  /**
   * Navigate to a specific lead by ID.
   */
  async gotoId(id: string): Promise<ReturnType<BasePage["goto"]>> {
    return this.gotoPath(`/panel/leads/${id}`);
  }

  // ── Lead Header ──────────────────────────────────────────────────────

  /** Lead name (heading) */
  get leadName(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  /** Lead email */
  get leadEmail(): Locator {
    return this.page.getByText(/@/).first();
  }

  /** Current status badge (uses aria-label "Estado: {label}" from LeadStatusBadge) */
  get statusBadge(): Locator {
    return this.page.locator('[aria-label^="Estado:"]');
  }

  // ── Contact Info Section ─────────────────────────────────────────────

  get contactInfoSection(): Locator {
    return this.page.getByRole("region", { name: /información de contacto/i });
  }

  // ── Status Change ────────────────────────────────────────────────────

  get statusChangeSection(): Locator {
    return this.page.getByRole("region", { name: /cambiar estado/i });
  }

  /** Status change select */
  get statusSelect(): Locator {
    return this.page.getByLabel(/cambiar estado del lead/i);
  }

  // ── Notes ────────────────────────────────────────────────────────────

  get notesSection(): Locator {
    return this.page.getByRole("region", { name: /notas internas/i });
  }

  get noteInput(): Locator {
    return this.page.getByLabel(/nueva nota/i);
  }

  get addNoteButton(): Locator {
    return this.page.getByRole("button", { name: /añadir nota/i });
  }

  /** List of existing notes */
  get noteList(): Locator {
    return this.notesSection.locator("div").filter({ has: this.page.locator("p") });
  }

  // ── History Timeline ─────────────────────────────────────────────────

  get historySection(): Locator {
    return this.page.getByRole("region", { name: /histórico de cambios/i });
  }

  get historyTimeline(): Locator {
    return this.historySection.locator("ol");
  }

  /** History entries (li elements in the timeline) */
  get historyEntries(): Locator {
    return this.historyTimeline.locator("li");
  }

  // ── Reassign (ADMIN only) ────────────────────────────────────────────

  get reassignSection(): Locator {
    return this.page.getByRole("region", { name: /reasignar lead/i });
  }

  get reassignButton(): Locator {
    return this.page.getByRole("button", { name: /reasignar lead/i });
  }

  get reassignInput(): Locator {
    return this.page.getByLabel(/nuevo agente/i);
  }

  get reassignConfirmButton(): Locator {
    return this.page.getByRole("button", { name: /confirmar reasignación/i });
  }

  get reassignCancelButton(): Locator {
    return this.page.getByRole("button", { name: /cancelar reasignación/i });
  }

  // ── Actions ──────────────────────────────────────────────────────────

  /**
   * Change lead status by selecting from the dropdown.
   */
  async changeStatus(statusLabel: string): Promise<void> {
    await this.statusSelect.selectOption({ label: statusLabel });
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Add an internal note.
   */
  async addNote(text: string): Promise<void> {
    await this.noteInput.fill(text);
    await this.addNoteButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
