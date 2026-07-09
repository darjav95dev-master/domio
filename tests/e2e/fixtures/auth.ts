import { type Page, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";

/**
 * Authenticates a user via the login form and waits for redirect to /panel.
 *
 * Retries once on failure to handle intermittent Next.js dev server issues.
 *
 * @param page - Playwright Page instance
 * @param email - User email (e.g. "admin@domio.dev")
 * @param password - User password (e.g. "Domio2026!")
 *
 * @see constitution.md §3 — FR-005, test credentials from seed
 * @see tasks.md T004
 */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await attemptLogin(page, email, password);
}

async function attemptLogin(
  page: Page,
  email: string,
  password: string,
  isRetry = false,
): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.fillEmail(email);
  await loginPage.fillPassword(password);
  await loginPage.submit();

  try {
    // Wait for redirect to dashboard (accepts /panel or /panel/)
    await page.waitForURL(/\/panel\/?$/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    // Confirm we're on the dashboard
    expect(page.url()).toContain("/panel");
  } catch (err) {
    if (!isRetry) {
      // Retry once: the login may have failed due to a timing/CSRF issue
      await page.waitForTimeout(500);
      return attemptLogin(page, email, password, true);
    }
    throw err;
  }
}
