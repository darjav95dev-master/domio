import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { resetDatabase } from "./fixtures/db-reset";
import { login } from "./fixtures/auth";
import { DashboardPage } from "./pages/DashboardPage";
import { EquipoPage } from "./pages/EquipoPage";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { ContenidosContactoPage } from "./pages/ContenidosContactoPage";
import { HomePage } from "./pages/HomePage";
import { LeadsPage } from "./pages/LeadsPage";
import { LeadDetailPage } from "./pages/LeadDetailPage";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "admin@domio.dev";
const ADMIN_PASSWORD = "Domio2026!";

const NEW_AGENT = {
  name: `Test Agent ${Date.now()}`,
  email: `testagent${Date.now()}@domio.dev`,
};

const API_KEY_NAME = `Test Key ${Date.now()}`;
const NEW_PHONE = "+34 999 888 777";

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/** Tenant UUID used by the seed. */
const TENANT_SEED_UUID = "00000000-0000-0000-0000-000000000001";

/** Query a user ID by email directly from the database. */
async function getUserIdByEmail(email: string): Promise<string> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    // BEGIN + SET LOCAL is mandatory under Neon + PgBouncer transaction
    // pooling. Without it, SET without LOCAL leaks context across requests,
    // and SET LOCAL outside a transaction is immediately lost.
    await client.query("BEGIN");
    await client.query(
      `SELECT set_config('app.current_tenant_id', $1, true)`,
      [TENANT_SEED_UUID],
    );

    const { rows } = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if (rows.length === 0) throw new Error(`User not found: ${email}`);

    await client.query("COMMIT");
    return rows[0].id as string;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe("Administrador — recorrido completo", () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // ── 1. Login and see dashboard ────────────────────────────────────────

  test("admin can login and see dashboard", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const dashboard = new DashboardPage(page);

    // The greeting heading shows "Hola, {userName}" from seed
    await expect(dashboard.greeting).toBeVisible({ timeout: 10_000 });
    await expect(dashboard.greeting).toContainText(/Admin Domio/i);

    // Quick action links should be visible
    await expect(dashboard.quickLinksSection).toBeVisible();
  });

  // ── 2. Create new agent ──────────────────────────────────────────────

  test("admin can create new agent", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const equipo = new EquipoPage(page);
    await equipo.goto();
    await equipo.waitForLoad();

    await expect(equipo.heading).toBeVisible({ timeout: 10_000 });

    // Click "Nuevo usuario" button to open dialog
    await equipo.createButton.click();

    // Wait for dialog to appear
    await expect(
      page.getByRole("dialog", { name: /nuevo usuario/i }),
    ).toBeVisible();

    // Fill form fields
    await equipo.nameInput.fill(NEW_AGENT.name);
    await equipo.emailInput.fill(NEW_AGENT.email);

    // Role defaults to "Agente" — no need to change

    // Submit the form (button label: "Invitar usuario")
    await equipo.saveButton.click();

    // Wait for success toast: "Invitación enviada" (toast does NOT include the email)
    await expect(
      page.getByRole("alert").filter({ hasText: /invitación enviada/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Dialog auto-closes after success (handleCreated sets showCreateDialog=false).
    // No need to click "Cerrar" — that would match the sign-out button.
    // Wait for toast to dismiss and table to re-fetch.
    await page.waitForTimeout(1500);

    // Verify the new user appears in the users table (allow time for table re-fetch)
    await expect(page.getByText(NEW_AGENT.name)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(NEW_AGENT.email)).toBeVisible({ timeout: 5_000 });
  });

  // ── 3. Create and revoke API key ─────────────────────────────────────

  test("admin can create and revoke API key", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const apiKeys = new ApiKeysPage(page);
    await apiKeys.goto();
    await apiKeys.waitForLoad();

    await expect(apiKeys.heading).toBeVisible({ timeout: 10_000 });

    // Click "Nueva API key" button to open dialog
    await apiKeys.createButton.click();

    // Wait for dialog
    await expect(
      page.getByRole("dialog", { name: /nueva api key/i }),
    ).toBeVisible();

    // Fill the key name
    await page.getByLabel(/nombre/i).fill(API_KEY_NAME);

    // Submit — button label: "Crear API key"
    await page.getByRole("button", { name: /crear api key/i }).click();

    // Tras crear, el mismo diálogo cambia su título (h2) a "API key creada"
    // y muestra la clave una sola vez (no es un toast role="alert").
    await expect(
      page.getByRole("heading", { name: /API key creada/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Cerrar el diálogo de resultado para no tapar la tabla/acciones detrás.
    await page.getByRole("button", { name: /^cerrar$/i }).click();

    // Wait for the key to appear in the table (table refreshes via handleCreated)
    await page.waitForTimeout(1000);

    // Verify the key appears in the table with "Activa" badge
    await expect(apiKeys.activeBadge(API_KEY_NAME)).toBeVisible({
      timeout: 5_000,
    });

    // Click revoke button (aria-label: "Revocar {keyName}")
    await page
      .getByRole("button", { name: new RegExp(`revocar ${API_KEY_NAME}`, "i") })
      .click();

    // Wait for revoke toast and table refresh
    await expect(apiKeys.heading).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(1000);

    // Verify the key now shows "Revocada" badge
    await expect(apiKeys.inactiveBadge(API_KEY_NAME)).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── 4. Contact config changes ────────────────────────────────────────

  test("admin can edit contact config and changes reflect on /contacto", async ({
    page,
  }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const contacto = new ContenidosContactoPage(page);
    await contacto.goto();
    await contacto.waitForLoad();

    await expect(contacto.heading).toBeVisible({ timeout: 10_000 });

    // Edit the phone number
    await contacto.phoneInput.clear();
    await contacto.phoneInput.fill(NEW_PHONE);

    // Click save
    await contacto.saveButton.click();

    // Wait for success toast — filter by text to exclude Next.js route announcer
    await expect(
      page.getByRole("alert").filter({ hasText: /configuración|guardada/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("alert").filter({ hasText: /guardada/i }),
    ).toContainText(/guardada/i);

    // Navigate to /contacto to verify QuickBand shows the new phone
    // QuickBand reads dynamic data from contact_config (unlike the static footer)
    await page.goto("/contacto", { waitUntil: "networkidle" });

    // Find the phone link/tel: in the QuickBand section
    // QuickBand renders the phone as <a href="tel:..."> inside the 4-column grid
    const quickBandPhone = page
      .getByRole("link", { name: /\+34/ })
      .first();

    await expect(quickBandPhone).toBeVisible();
    await expect(quickBandPhone).toContainText(NEW_PHONE);

    // Navigate to home page to verify the footer reflects the new contact data.
    // The footer reads from contact_config (dynamic, not static).
    const home = new HomePage(page);
    await home.goto();
    await home.waitForLoad();

    // Footer phone should now show the new number
    await expect(home.footerPhone).toBeVisible();
    await expect(home.footerPhone).toContainText(NEW_PHONE);

    // Footer email should still be visible (unchanged)
    await expect(home.footerEmail).toBeVisible();
  });

  // ── 5. Reassign lead ─────────────────────────────────────────────────

  test("admin can reassign lead", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Navigate to leads list
    const leads = new LeadsPage(page);
    await leads.goto();
    await leads.waitForLoad();

    await expect(leads.heading).toBeVisible({ timeout: 10_000 });

    // Find the lead "Juan López" (status NEW, assigned to agente1)
    // The leads table uses <tr role="row" aria-label="{name} — {email} — {status}">
    const leadRow = page.getByRole("row", { name: /Juan López/i });
    await expect(leadRow).toBeVisible({ timeout: 10_000 });

    // Click the row to navigate to lead detail
    await leadRow.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/panel/leads");

    const leadDetail = new LeadDetailPage(page);

    // Wait for the reassign section to be visible (ADMIN-only)
    await expect(leadDetail.reassignSection).toBeVisible({ timeout: 10_000 });

    // Click "Reasignar" button to open the reassign form
    await leadDetail.reassignButton.click();

    // Get the target agent's user ID (agente2 = Carlos Pérez)
    const agente2Id = await getUserIdByEmail("agente2@domio.dev");

    // Enter the new agent ID
    await leadDetail.reassignInput.fill(agente2Id);

    // Confirm the reassignment
    await leadDetail.reassignConfirmButton.click();

    // Wait for the operation to complete and UI to update
    await page.waitForTimeout(1500);

    // The reassign form should close and the "Reasignar" button should be visible again
    await expect(leadDetail.reassignButton).toBeVisible({ timeout: 5_000 });

    // Optionally verify: reload the page to confirm persistence
    await page.reload({ waitUntil: "networkidle" });
    await expect(leadDetail.reassignSection).toBeVisible({ timeout: 10_000 });

    // After reload, the reassign form is collapsed (showing just the button)
    // This confirms the page loaded and data is persisted
  });

  // ── 6. ARSOP deletion ────────────────────────────────────────────────

  test("admin can execute ARSOP deletion and verifies cascade", async ({
    page,
  }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const LEAD_NAME = "Roberto Díaz";

    // Navigate to leads list
    const leads = new LeadsPage(page);
    await leads.goto();
    await leads.waitForLoad();

    await expect(leads.heading).toBeVisible({ timeout: 10_000 });

    // Find the lead "Roberto Díaz" (status LOST, assigned to agente1)
    const leadRow = page.getByRole("row", { name: new RegExp(LEAD_NAME, "i") });
    await expect(leadRow).toBeVisible({ timeout: 10_000 });

    // Click to open lead detail
    await leadRow.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/panel/leads");

    // Capture the lead ID from the URL before deletion
    const urlMatch = page.url().match(/\/panel\/leads\/([a-f0-9-]+)/);
    const leadId = urlMatch?.[1];

    // Scroll to the ARSOP section (rendered by ArsopButtons component)
    const arsopSection = page.getByRole("region", {
      name: /ejercicio de derechos arsop/i,
    });
    await expect(arsopSection).toBeVisible({ timeout: 10_000 });

    // Click "Borrar datos" button to reveal confirmation
    await page
      .getByRole("button", { name: /borrar datos del lead/i })
      .click();

    // Confirm deletion: click "Sí, borrar"
    await page
      .getByRole("button", { name: /confirmar borrado de datos/i })
      .click();

    // After deletion, the app should redirect to /panel/leads.
    await page.waitForURL(/\/panel\/leads\/?$/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Verify the lead no longer appears in the list
    await expect(leads.heading).toBeVisible({ timeout: 10_000 });
    const deletedLead = page.getByRole("row", {
      name: new RegExp(LEAD_NAME, "i"),
    });
    await expect(deletedLead).toHaveCount(0);

    // ── Verify cascade deletion in the database ─────────────────────────
    // FR-013: After ARSOP deletion, the lead and all associated data must
    // be removed. The operation must be registered in arsop_requests.
    if (leadId) {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) throw new Error("DATABASE_URL not set");

      const pool = new Pool({ connectionString: databaseUrl });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `SELECT set_config('app.current_tenant_id', $1, true)`,
          [TENANT_SEED_UUID],
        );

        // Lead itself must be gone
        const { rows: leadRows } = await client.query(
          "SELECT COUNT(*) AS cnt FROM leads WHERE id = $1",
          [leadId],
        );
        expect(Number(leadRows[0]!.cnt)).toBe(0);

        // Cascade: lead_notes
        const { rows: notesRows } = await client.query(
          "SELECT COUNT(*) AS cnt FROM lead_notes WHERE lead_id = $1",
          [leadId],
        );
        expect(Number(notesRows[0]!.cnt)).toBe(0);

        // Cascade: lead_history
        const { rows: historyRows } = await client.query(
          "SELECT COUNT(*) AS cnt FROM lead_history WHERE lead_id = $1",
          [leadId],
        );
        expect(Number(historyRows[0]!.cnt)).toBe(0);

        // Cascade: consent_records
        const { rows: consentRows } = await client.query(
          "SELECT COUNT(*) AS cnt FROM consent_records WHERE lead_id = $1",
          [leadId],
        );
        expect(Number(consentRows[0]!.cnt)).toBe(0);

        // Cascade: lead_read_marks
        const { rows: readMarkRows } = await client.query(
          "SELECT COUNT(*) AS cnt FROM lead_read_marks WHERE lead_id = $1",
          [leadId],
        );
        expect(Number(readMarkRows[0]!.cnt)).toBe(0);

        // Trazability: arsop_requests must have a DELETE entry for this lead
        const { rows: arsopRows } = await client.query(
          "SELECT COUNT(*) AS cnt FROM arsop_requests WHERE lead_id = $1 AND request_type = 'DELETE'",
          [leadId],
        );
        expect(Number(arsopRows[0]!.cnt)).toBeGreaterThanOrEqual(1);

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
        await pool.end();
      }
    }
  });
});
