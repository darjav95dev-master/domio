import { test, expect } from "@playwright/test";
import { resetDatabase } from "./fixtures/db-reset";

/**
 * Favoritos — client-side (localStorage), no login required.
 *
 * Covers the full visitor flow:
 * - save from a portafolio card → nav badge appears
 * - saved item shows on /favoritos and survives a reload
 * - remove it → empty state, badge gone
 *
 * @see src/features/favorites/*
 */
test.describe("Favoritos — visitante sin login", () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  const CARD = "article[aria-label]";
  const favButton = "[data-testid=favorite-button]";
  const favCount = "[data-testid=fav-count]";

  test("save from portafolio, appears in /favoritos and persists on reload", async ({
    page,
  }) => {
    await page.goto("/portafolio");
    await expect(page.locator(CARD).first()).toBeVisible();

    // No favorites yet → no nav badge.
    await expect(page.locator(favCount)).toHaveCount(0);

    // Save the first property.
    const firstCard = page.locator(CARD).first();
    const savedName = await firstCard.getAttribute("aria-label");
    await firstCard.locator(favButton).click();

    // Button reflects pressed state; nav badge shows 1.
    await expect(firstCard.locator(favButton)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(favCount)).toHaveText("1");

    // Navigate to /favoritos → the saved property is listed.
    await page.goto("/favoritos");
    await expect(
      page.getByRole("heading", { name: "Favoritos", level: 1 }),
    ).toBeVisible();
    const favCards = page.locator(CARD);
    await expect(favCards).toHaveCount(1);
    expect(await favCards.first().getAttribute("aria-label")).toBe(savedName);

    // Persists across reload (localStorage).
    await page.reload();
    await expect(page.locator(CARD)).toHaveCount(1);
    await expect(page.locator(favCount)).toHaveText("1");
  });

  test("remove favorite shows empty state and clears badge", async ({
    page,
  }) => {
    // Seed one favorite via the portafolio card, then remove it on /favoritos.
    await page.goto("/portafolio");
    await expect(page.locator(CARD).first()).toBeVisible();
    await page.locator(CARD).first().locator(favButton).click();
    await expect(page.locator(favCount)).toHaveText("1");

    await page.goto("/favoritos");
    await expect(page.locator(CARD)).toHaveCount(1);

    // Un-save it.
    await page.locator(CARD).first().locator(favButton).click();

    // Empty state appears, nav badge is gone.
    await expect(page.getByText(/no has guardado ning/i)).toBeVisible();
    await expect(page.locator(favCount)).toHaveCount(0);
  });
});
