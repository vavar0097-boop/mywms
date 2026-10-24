import { expect, test } from "@playwright/test";

test.describe("dashboard", () => {
  test("shows outlet POS sales and removes weekly movement", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("POS Sales by Outlet")).toBeVisible();
    await expect(page.getByText("Auto refresh 30s")).toBeVisible();
    await expect(page.getByText("POS Snapshot")).toBeVisible();
    await expect(page.getByText("Weekly Movement")).toHaveCount(0);
  });
});
