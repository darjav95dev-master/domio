import { test, expect } from "@playwright/test";
import { resetDatabase } from "./fixtures/db-reset";
import { login } from "./fixtures/auth";
import { HomePage } from "./pages/HomePage";
import { PortafolioPage } from "./pages/PortafolioPage";
import { InmuebleDetailPage } from "./pages/InmuebleDetailPage";
import { LeadsPage } from "./pages/LeadsPage";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_LEAD = {
  name: `Test Visitor ${Date.now()}`,
  email: `visitor${Date.now()}@example.com`,
  phone: "+34 600 000 000",
  message: "Me interesa esta promoción. Quiero recibir más información.",
};

// Mapping slug → assigned agent email from seed data (scripts/seed.ts).
// Used in the backoffice verification test to login as the correct agent.
const SLUG_TO_AGENT: Record<string, string> = {
  "residencial-las-americas": "agente1@domio.dev",
  "apartamentos-costa-adeje": "agente2@domio.dev",
  "villas-la-laguna": "agente1@domio.dev",
  "pisos-santa-cruz-centro": "agente2@domio.dev",
};

/**
 * Slug used for the lead creation test and backoffice verification.
 *
 * Uses a deterministic slug from seed ("residencial-las-americas") instead
 * of a shared variable between tests. This avoids fragile cross-test state
 * coupling: if tests were reordered or skipped, the shared variable approach
 * would produce incorrect results.
 *
 * @see M6 - avoid shared global state between tests
 */
const DETERMINISTIC_SLUG = "residencial-las-americas";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe("Visitante público — recorrido completo", () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // ── 1. Home loads with real content ─────────────────────────────────────

  test("home loads with real content", async ({ page }) => {
    const home = new HomePage(page);
    const response = await home.goto();

    expect(response?.status()).toBe(200);
    await home.waitForLoad();

    // Hero section — claim (h1) from seed
    await expect(home.heroSection).toBeVisible();
    await expect(home.heroClaim).toBeVisible();
    await expect(home.heroClaim).toHaveText(
      /Tu hogar en Canarias empieza aqu/i,
    );

    // Hero CTAs
    await expect(home.heroCtaPrimary).toBeVisible();
    await expect(home.heroCtaSecondary).toBeVisible();

    // Trust section
    await expect(home.trustSection).toBeVisible();

    // Featured portfolio — at least one card
    await expect(home.featuredPortfolioSection).toBeVisible();
    const cardCount = await home.featuredPortfolioCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // FAQ section
    await expect(home.faqHeading).toBeVisible();

    // Navigation
    await expect(home.nav).toBeVisible();
    await expect(home.navPortafolioLink).toBeVisible();
    await expect(home.navContactoLink).toBeVisible();

    // Footer — phone and email from seed contact_config
    await expect(home.footer).toBeVisible();
    await expect(home.footerPhone).toBeVisible();
    await expect(home.footerEmail).toBeVisible();
  });

  // ── 2. Portafolio filters work correctly ────────────────────────────────

  test("portafolio filters work correctly", async ({ page }) => {
    const portafolio = new PortafolioPage(page);
    await portafolio.goto();
    await portafolio.waitForLoad();

    await expect(portafolio.heading).toBeVisible();
    await expect(portafolio.filterBar).toBeVisible();

    // Apply island filter: Tenerife
    await portafolio.selectFilter(portafolio.filterIsland, "Tenerife");

    // Apply operation filter: Venta (SALE)
    await portafolio.selectFilter(portafolio.filterOperation, "Venta");

    // Verify URL reflects active filters
    const url = page.url();
    expect(url).toContain("island=Tenerife");
    expect(url).toContain("operation=SALE");

    // Verify result count is visible and greater than zero
    await expect(portafolio.resultCount).toBeVisible();
    const countText = await portafolio.resultCount.textContent();
    const match = countText?.match(/(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(0);

    // Verify at least one property card is rendered
    const cardCount = await portafolio.propertyCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Detail page shows full property info ─────────────────────────────

  test("detail page shows full property info", async ({ page }) => {
    const portafolio = new PortafolioPage(page);
    await portafolio.goto();
    await portafolio.waitForLoad();

    await portafolio.clickFirstProperty();

    // Verify navigation landed on a detail page
    expect(page.url()).toContain("/inmuebles/");

    const detail = new InmuebleDetailPage(page);
    await detail.waitForLoad();

    // Property name is visible in the sidebar
    await expect(detail.propertyName).toBeVisible();

    // Info bar (precio, superficie, dormitorios, entrega)
    await expect(detail.infoBar).toBeVisible();

    // Editorial blocks (descripcion, calidades, etc.)
    await expect(detail.editorialBlocks.first()).toBeVisible();

    // Typology section / table
    await expect(detail.typologySection).toBeVisible();

    // Map container
    await expect(detail.mapContainer).toBeVisible();

    // Contact form heading present on detail page
    await expect(detail.contactFormHeading).toBeVisible();
  });

  // ── 4. Contact form creates lead with consent ───────────────────────────
  //
  // NOTE: navigates to "residencial-las-americas" deterministically instead
  // of clicking the first PropertyCard. This avoids coupling with the
  // PortafolioPage test (which may have applied filters earlier) and
  // eliminates the shared global variable for cross-test state.

  test("contact form creates lead with consent", async ({ page }) => {
    const detail = new InmuebleDetailPage(page);
    await detail.gotoSlug(DETERMINISTIC_SLUG);
    await detail.waitForLoad();

    // Fill and submit the contact form with consent
    await detail.submitContactForm({
      name: TEST_LEAD.name,
      email: TEST_LEAD.email,
      phone: TEST_LEAD.phone,
      message: TEST_LEAD.message,
      acceptConsent: true,
    });

    // Verify success status message appears
    await expect(detail.contactSuccessMessage).toBeVisible({ timeout: 10_000 });
    await expect(detail.contactSuccessMessage).toHaveText(
      /Solicitud recibida/i,
    );
  });

  // ── 5. Lead appears in backoffice ───────────────────────────────────────

  test("lead appears in backoffice", async ({ page }) => {
    // Use the deterministic slug from seed to determine the assigned agent.
    // This avoids coupling with test 4 (which also uses the same slug).
    // DETERMINISTIC_SLUG is "residencial-las-americas", which is always in the map
    const agentEmail = SLUG_TO_AGENT[DETERMINISTIC_SLUG] as string;

    // Login as the agent assigned to that property
    await login(page, agentEmail, "Domio2026!");

    // Navigate to /panel/leads
    const leads = new LeadsPage(page);
    await leads.goto();
    await leads.waitForLoad();

    // Wait for the leads table to render
    await expect(leads.heading).toBeVisible();

    // Find the lead by name in the table rows
    // Each <tr role="row"> has aria-label: "${name} — ${email} — ${status}"
    const leadRow = page.getByRole("row", {
      name: new RegExp(TEST_LEAD.name, "i"),
    });
    await expect(leadRow).toBeVisible({ timeout: 10_000 });

    // Verify the lead status is NEW (aria-label ends with " — NEW")
    await expect(leadRow).toHaveAttribute("aria-label", / — NEW$/);
  });
});
