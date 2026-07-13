/* eslint-disable sonarjs/no-duplicate-string -- test file: aria-label and
   similar DOM attribute strings appear many times by design. */

import { test, expect } from "@playwright/test";
import { resetDatabase } from "./fixtures/db-reset";
import { login } from "./fixtures/auth";
import { DashboardPage } from "./pages/DashboardPage";
import { LeadsPage } from "./pages/LeadsPage";
import { LeadDetailPage } from "./pages/LeadDetailPage";

// ---------------------------------------------------------------------------
// Test data — matches scripts/seed.ts
// ---------------------------------------------------------------------------

const AGENT1_EMAIL = "agente1@domio.dev";
const AGENT2_EMAIL = "agente2@domio.dev";
const DEMO_PASSWORD = "Domio2026!";
const AGENT1_NAME = "Ana García";

/**
 * Leads assigned to agente1 (Ana García) in seed data:
 *   - Juan López   — NEW
 *   - Pedro Sánchez — IN_NEGOTIATION
 *   - Roberto Díaz  — LOST
 *
 * Leads assigned to agente2 (Carlos Pérez) in seed data:
 *   - María Torres  — CONTACTED
 *   - Laura Martín  — WON
 */
const AGENT1_LEAD_NAME = "Juan López";
const AGENT2_LEAD_NAME = "María Torres";

/**
 * Expected initial unread count for agente1 after seed.
 * The dashboard repository counts leads with status in (NEW, CONTACTED, IN_NEGOTIATION)
 * that have no read mark. Agente1 has:
 *   - Juan López (NEW)                  → counted
 *   - Pedro Sánchez (IN_NEGOTIATION)    → counted
 *   - Roberto Díaz (LOST)               → excluded by status filter
 * Total: 2
 */
const EXPECTED_UNREAD_COUNT = 2;

/** Internal note text to add during the test. */
const NOTE_TEXT = "Llamada realizada, interesado en visitar la próxima semana.";

/** URL pattern for lead detail pages. */
const LEADS_URL_RE = /\/panel\/leads\//;

// ---------------------------------------------------------------------------
// Helper: login as agente1 and navigate to a specific lead by name
// ---------------------------------------------------------------------------

async function loginAndOpenLead(
  page: import("@playwright/test").Page,
  leadName: string,
): Promise<void> {
  await login(page, AGENT1_EMAIL, DEMO_PASSWORD);
  const leads = new LeadsPage(page);
  await leads.goto();
  await leads.waitForLoad();
  await expect(leads.heading).toBeVisible();

  const leadRow = page.getByRole("row", {
    name: new RegExp(leadName, "i"),
  });
  await expect(leadRow).toBeVisible();
  await leadRow.click();
  await page.waitForURL(LEADS_URL_RE);
  await page.waitForLoadState("networkidle");
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe("Agente comercial — recorrido completo", () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // ── 1. Login and dashboard badge ─────────────────────────────────────────

  test("agent sees unread leads badge on dashboard", async ({ page }) => {
    await login(page, AGENT1_EMAIL, DEMO_PASSWORD);

    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    // Verify greeting contains the agent's name
    await expect(dashboard.greeting).toBeVisible();
    await expect(dashboard.greeting).toHaveText(new RegExp(AGENT1_NAME, "i"));

    // Verify unread leads count badge shows the correct number
    // The dashboard renders <span aria-live="polite">{count}</span>
    // for the unread count when count > 0.
    const badge = page.locator("[aria-live='polite']").first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(String(EXPECTED_UNREAD_COUNT));

    // Verify the "Leads no leídos" label is visible
    await expect(dashboard.unreadLeadsLabel).toBeVisible();
    await expect(dashboard.unreadLeadsLabel).toHaveText("Leads no leídos");
  });

  // ── 2. Open a NEW lead — marks as read, badge decrements ─────────────────

  test("opening a lead marks it as read and decrements badge", async ({
    page,
  }) => {
    await login(page, AGENT1_EMAIL, DEMO_PASSWORD);

    // Navigate to leads list
    const leads = new LeadsPage(page);
    await leads.goto();
    await leads.waitForLoad();
    await expect(leads.heading).toBeVisible();

    // Find the NEW lead (Juan López) by aria-label on the table row.
    // Each row has aria-label: "${name} — ${email} — ${status}"
    const newLeadRow = page.getByRole("row", {
      name: new RegExp(AGENT1_LEAD_NAME, "i"),
    });
    await expect(newLeadRow).toBeVisible();
    await expect(newLeadRow).toHaveAttribute("aria-label", / — NEW$/);

    // Click the row to open the lead detail
    await newLeadRow.click();
    await page.waitForURL(LEADS_URL_RE);
    await page.waitForLoadState("networkidle");

    // Verify we landed on the lead detail page
    const leadDetail = new LeadDetailPage(page);
    await expect(leadDetail.leadName).toBeVisible();
    await expect(leadDetail.leadName).toHaveText(AGENT1_LEAD_NAME);

    // Navigate back to dashboard — the lead was auto-marked as read
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    // Verify badge decremented from EXPECTED_UNREAD_COUNT to EXPECTED_UNREAD_COUNT - 1
    const badge = page.locator("[aria-live='polite']").first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(String(EXPECTED_UNREAD_COUNT - 1));
  });

  // ── 3. Change state NEW → CONTACTED ──────────────────────────────────────

  test("can change lead state from NEW to CONTACTED", async ({ page }) => {
    await loginAndOpenLead(page, AGENT1_LEAD_NAME);

    const leadDetail = new LeadDetailPage(page);

    // Verify current status is NEW
    await expect(leadDetail.statusBadge).toHaveAttribute(
      "aria-label",
      "Estado: Nuevo",
    );

    // Change status from NEW to CONTACTED
    // The <select> has aria-label="Cambiar estado del lead"
    // Only valid transition from NEW is CONTACTED → label "Contactado"
    await leadDetail.changeStatus("Contactado");

    // Wait for the server action to complete and UI to update
    await page.waitForLoadState("networkidle");

    // Verify status badge now shows CONTACTED
    await expect(leadDetail.statusBadge).toHaveAttribute(
      "aria-label",
      "Estado: Contactado",
    );

    // Verify the state transition appears in the history timeline
    const historySection = page.getByRole("region", {
      name: /histórico de cambios/i,
    });
    await expect(historySection).toBeVisible();

    // The first history entry should show the new status
    const firstHistoryEntry = historySection.locator("ol li").first();
    await expect(firstHistoryEntry).toContainText("Contactado");
  });

  // ── 4. Add internal note ─────────────────────────────────────────────────

  test("can add internal note to lead", async ({ page }) => {
    await loginAndOpenLead(page, AGENT1_LEAD_NAME);

    const leadDetail = new LeadDetailPage(page);

    // The lead was changed to CONTACTED in test 3; verify it
    await expect(leadDetail.statusBadge).toHaveAttribute(
      "aria-label",
      "Estado: Contactado",
    );

    // Wait for the notes section to be ready
    await expect(leadDetail.notesSection).toBeVisible();

    // Type and submit a note
    await leadDetail.noteInput.fill(NOTE_TEXT);
    await leadDetail.addNoteButton.click();
    await page.waitForLoadState("networkidle");

    // Verify the note appears in the notes timeline
    await expect(leadDetail.notesSection).toContainText(NOTE_TEXT);
  });

  // ── 5. Change state to WON (via IN_NEGOTIATION) ──────────────────────────

  test("can change lead state to WON", async ({ page }) => {
    await loginAndOpenLead(page, AGENT1_LEAD_NAME);

    const leadDetail = new LeadDetailPage(page);

    // Current status is CONTACTED from test 3.
    // Valid transitions: CONTACTED → IN_NEGOTIATION (label "En negociación")
    await expect(leadDetail.statusBadge).toHaveAttribute(
      "aria-label",
      "Estado: Contactado",
    );

    // Step 1: CONTACTED → IN_NEGOTIATION
    await leadDetail.statusSelect.selectOption({ label: "En negociación" });
    await page.waitForLoadState("networkidle");

    // Verify status updated
    await expect(leadDetail.statusBadge).toHaveAttribute(
      "aria-label",
      "Estado: En negociación",
    );

    // Step 2: IN_NEGOTIATION → WON (label "Ganado")
    await leadDetail.statusSelect.selectOption({ label: "Ganado" });
    await page.waitForLoadState("networkidle");

    // Verify final state is WON
    await expect(leadDetail.statusBadge).toHaveAttribute(
      "aria-label",
      "Estado: Ganado",
    );

    // Verify history shows the full transition chain
    const historySection = page.getByRole("region", {
      name: /histórico de cambios/i,
    });
    await expect(historySection).toBeVisible();

    // First entry should be WON (most recent transition)
    const firstEntry = historySection.locator("ol li").first();
    await expect(firstEntry).toContainText("Ganado");
  });

  // ── 6. RLS isolation — access denied to other agent leads ────────────────

  test("RLS prevents access to other agent leads", async ({
    page,
    browser,
  }) => {
    // ── Step 1: Get a lead ID belonging to agente2 ───────────────────────
    // Use a separate browser context to login as agente2, open a lead,
    // and extract its ID from the URL.
    const agente2Ctx = await browser.newContext();
    const agente2Page = await agente2Ctx.newPage();

    await login(agente2Page, AGENT2_EMAIL, DEMO_PASSWORD);

    // Navigate to leads list
    const agente2Leads = new LeadsPage(agente2Page);
    await agente2Leads.goto();
    await agente2Leads.waitForLoad();
    await expect(agente2Leads.heading).toBeVisible();

    // Open María Torres (belongs to agente2)
    const agente2LeadRow = agente2Page.getByRole("row", {
      name: new RegExp(AGENT2_LEAD_NAME, "i"),
    });
    await expect(agente2LeadRow).toBeVisible();
    await agente2LeadRow.click();
    await agente2Page.waitForURL(/\/panel\/leads\//);

    // Extract the lead ID from the URL
    const agente2LeadId = agente2Page.url().split("/").pop();
    expect(agente2LeadId).toBeDefined();
    expect(agente2LeadId?.length).toBeGreaterThan(0);

    await agente2Ctx.close();

    // ── Step 2: Login as agente1 and try to access that lead ────────────
    await login(page, AGENT1_EMAIL, DEMO_PASSWORD);

    // Navigate directly to the lead owned by agente2
    const leadDetail = new LeadDetailPage(page);
    const response = await leadDetail.gotoId(agente2LeadId!);
    await page.waitForLoadState("networkidle");

    // Verify access is denied. The server returns 200 with a "not found"
    // UI rather than a 403 (security: don't reveal if the record exists).
    // This is the standard behavior: repo.findById returns null when RLS
    // filters the row out, and the page renders "Lead no encontrado".
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: /lead no encontrado/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/el lead que buscas no existe o no tienes acceso/i),
    ).toBeVisible();
  });
});
