import { test, expect } from "@playwright/test";
import { resetDatabase } from "./fixtures/db-reset";
import { login } from "./fixtures/auth";
import { DashboardPage } from "./pages/DashboardPage";
import { CatalogoPage } from "./pages/CatalogoPage";
import { CatalogoEditPage } from "./pages/CatalogoEditPage";
import { InmuebleDetailPage } from "./pages/InmuebleDetailPage";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const OPERATOR_EMAIL = "operador1@domio.dev";
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- demo password from seed (scripts/seed.ts)
const OPERATOR_PASSWORD = "Domio2026!";
const OPERATOR_NAME = "Laura Rodríguez";

/** A PUBLISHED portfolio promotion from seed. */
const TARGET_PROMO = {
  name: "Residencial Las Américas",
  slug: "residencial-las-americas",
  initialConstructionStatus: "ON_PLAN",
  newConstructionStatus: "IN_CONSTRUCTION",
  initialConstructionLabel: "Sobre plano",
  newConstructionLabel: "En construcción",
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe("Editor de catálogo — recorrido completo", () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // ── 1. Login and dashboard ───────────────────────────────────────────────

  test("operator can login and see dashboard", async ({ page }) => {
    await login(page, OPERATOR_EMAIL, OPERATOR_PASSWORD);

    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    // Verify greeting contains the operator's name
    await expect(dashboard.greeting).toBeVisible();
    await expect(dashboard.greeting).toHaveText(new RegExp(OPERATOR_NAME, "i"));

    // Verify quick links are visible
    await expect(dashboard.quickLinksSection).toBeVisible();
    await expect(dashboard.catalogoLink).toBeVisible();
  });

  // ── 2. Catalog list with filters ─────────────────────────────────────────

  test("catalog list loads with filters", async ({ page }) => {
    await login(page, OPERATOR_EMAIL, OPERATOR_PASSWORD);
    const catalogo = new CatalogoPage(page);
    await catalogo.goto();
    await catalogo.waitForLoad();

    // Page heading
    await expect(catalogo.heading).toBeVisible();
    await expect(catalogo.heading).toHaveText("Catálogo");

    // "Nueva promoción" link
    await expect(catalogo.nuevaPromocionLink).toBeVisible();

    // Filter section — each filter control should be present
    await expect(catalogo.filterStatus).toBeVisible();
    await expect(catalogo.filterKind).toBeVisible();
    await expect(catalogo.filterIsland).toBeVisible();
    await expect(catalogo.filterConstructionStatus).toBeVisible();

    // Promotion list renders at least one item (seed has 8 promociones)
    await expect(catalogo.promotionList).toBeVisible();
    const itemCount = await catalogo.promotionItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Edit form loads with all sections ─────────────────────────────────

  test("edit form loads with all sections", async ({ page }) => {
    await login(page, OPERATOR_EMAIL, OPERATOR_PASSWORD);
    const catalogo = new CatalogoPage(page);
    await catalogo.goto();
    await catalogo.waitForLoad();

    // Click on the target promotion
    await catalogo.clickPromotion(TARGET_PROMO.name);

    // Wait for navigation to edit page
    await page.waitForURL(/\/panel\/catalogo\//);
    await page.waitForLoadState("networkidle");

    const editPage = new CatalogoEditPage(page);

    // Heading shows the promotion name
    await expect(editPage.heading).toBeVisible();
    await expect(editPage.heading).toHaveText(TARGET_PROMO.name);

    // Back link to catalog
    await expect(editPage.backLink).toBeVisible();

    // Form sections — verify key elements are rendered
    await expect(editPage.promocionForm).toBeVisible();
    await expect(editPage.constructionStatusSelect).toBeVisible();
    await expect(editPage.publishButton).toBeVisible();
    await expect(editPage.saveDraftButton).toBeVisible();
  });

  // ── 4. Autosave persists draft changes ──────────────────────────────────
  //
  // NOTE: FR-012 specifies 30 seconds as the production autosave interval.
  // For E2E test speed, the dev server overrides this to 5 seconds via the
  // E2E_AUTOSAVE_INTERVAL env var (set in playwright.config.ts webServer).
  // The production 30s default is verified in unit tests
  // (use-autosave.spec.ts).

  test("autosave persists draft changes", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, OPERATOR_EMAIL, OPERATOR_PASSWORD);
    const catalogo = new CatalogoPage(page);
    await catalogo.goto();
    await catalogo.waitForLoad();

    // Navigate to the target promotion edit page
    await catalogo.clickPromotion(TARGET_PROMO.name);
    await page.waitForURL(/\/panel\/catalogo\//);
    await page.waitForLoadState("networkidle");

    const editPage = new CatalogoEditPage(page);

    // Verify current status shows the initial label
    await expect(editPage.constructionStatusSelect).toHaveValue(
      TARGET_PROMO.initialConstructionStatus,
    );

    // Change construction_status to new value
    await editPage.constructionStatusSelect.selectOption(
      TARGET_PROMO.newConstructionStatus,
    );

    // Wait for the autosave to complete (the "Borrador guardado" indicator appears
    // only after the PATCH response is received and the DB transaction has committed).
    // The autosave fires every 5s (E2E override) after mount; the assert timeout
    // of 45_000 gives ample margin for the interval to fire.
    await expect(
      page.getByRole("status").filter({ hasText: /borrador guardado/i }),
    ).toBeVisible({ timeout: 45_000 });

    // Reload the page to verify the draft was persisted
    await page.reload();
    await page.waitForLoadState("networkidle");

    // The draft should be restored — verify construction_status preserved
    const editPageReloaded = new CatalogoEditPage(page);
    await expect(editPageReloaded.constructionStatusSelect).toHaveValue(
      TARGET_PROMO.newConstructionStatus,
    );
  });

  // ── 5. Published changes appear on public detail ─────────────────────────

  test("published changes appear on public detail", async ({ page }) => {
    await login(page, OPERATOR_EMAIL, OPERATOR_PASSWORD);
    const catalogo = new CatalogoPage(page);
    await catalogo.goto();
    await catalogo.waitForLoad();

    // Navigate to the target promotion edit page
    await catalogo.clickPromotion(TARGET_PROMO.name);
    await page.waitForURL(/\/panel\/catalogo\//);
    await page.waitForLoadState("networkidle");

    const editPage = new CatalogoEditPage(page);

    // Ensure construction_status is set to the new value
    // (it should be from the previous test's autosave + draft restore)
    await expect(editPage.constructionStatusSelect).toHaveValue(
      TARGET_PROMO.newConstructionStatus,
    );

    // Click "Publicar" to persist changes to the live promotion
    await editPage.publishButton.click();

    // Wait for the save confirmation (success message from PATCH response)
    // Filter by text to exclude Next.js route announcer (role="alert") if present
    await expect(
      page.getByRole("alert").filter({ hasText: /guardado|correctamente/i }),
    ).toContainText(
      /guardado correctamente/i,
      { timeout: 10_000 },
    );

    // Navigate to the public detail page
    const detailPage = new InmuebleDetailPage(page);
    await detailPage.gotoSlug(TARGET_PROMO.slug);
    await detailPage.waitForLoad();

    // Verify the construction_status badge shows the new label
    await expect(detailPage.constructionStatusBadge).toBeVisible();
    await expect(detailPage.constructionStatusBadge).toHaveText(
      new RegExp(TARGET_PROMO.newConstructionLabel, "i"),
    );
  });
});
