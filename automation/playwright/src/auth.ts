import { expect, Page } from "@playwright/test";

import { Credentials } from "./env";

export async function login(page: Page, credentials: Credentials) {
  await page.goto("/login");
  const signInButton = page.getByRole("button", { name: /sign in/i });

  try {
    await expect(signInButton).toBeVisible();
  } catch (error) {
    const title = await page.title().catch(() => "");
    const bodyText = await page
      .locator("body")
      .innerText({ timeout: 2_000 })
      .catch(() => "");

    if (
      /404/i.test(title) ||
      /we couldn't find that page/i.test(bodyText) ||
      /empty reply/i.test(bodyText)
    ) {
      throw new Error(
        [
          "Login page did not load from the configured WMS_APP_URL.",
          "The host returned a hosting/provider error instead of the React app.",
          "Fix the frontend upload or run local automation with: npm run test:local",
        ].join(" "),
      );
    }

    throw error;
  }

  await page.getByPlaceholder("Enter your username").fill(credentials.username);
  await page.getByPlaceholder("Enter your password").fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}
