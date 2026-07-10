import { test, expect } from "@playwright/test";
import { resetDatabase } from "./fixtures/db-reset";

/**
 * Image pipeline regression guard.
 *
 * Locks in the Phase 1–2 fixes: catalog/home cards must render real images
 * (not the empty gradient fallback), and no image may point at the fake local
 * R2 host `local.example`.
 */
test.describe("Imágenes de promociones", () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  test("portafolio renders card images, none pointing at local.example", async ({
    page,
  }) => {
    await page.goto("/portafolio");
    await expect(page.locator("article[aria-label]").first()).toBeVisible();

    const imgs = page.locator("article[aria-label] img");
    expect(await imgs.count()).toBeGreaterThan(0);

    for (const src of await imgs.evaluateAll((els) =>
      els.map((el) => (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src),
    )) {
      expect(src, `image src should not use the fake R2 host: ${src}`).not.toContain(
        "local.example",
      );
    }
  });

  test("home featured portfolio renders images", async ({ page }) => {
    await page.goto("/");
    const heroImgs = page.locator("section img");
    await expect(heroImgs.first()).toBeVisible();
    expect(await heroImgs.count()).toBeGreaterThan(0);
  });
});
