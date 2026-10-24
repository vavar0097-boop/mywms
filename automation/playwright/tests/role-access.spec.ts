import { expect, Page, test } from "@playwright/test";

import { storageStatePath } from "../src/env";

function watchForbiddenApiResponses(page: Page) {
  const paths = new Set<string>();

  page.on("response", (response) => {
    if (response.status() !== 403 || !response.url().includes("/api/")) {
      return;
    }

    paths.add(new URL(response.url()).pathname.replace("/api/", ""));
  });

  return paths;
}

async function expectDashboardLoaded(page: Page) {
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();
  await expect(page.getByText("Dashboard failed to load")).toHaveCount(0);
}

test.describe("role-specific access", () => {
  test.describe("owner", () => {
    test.use({ storageState: storageStatePath("owner") });

    test("owner opens the complete dashboard", async ({ page }) => {
      const forbiddenApiPaths = watchForbiddenApiResponses(page);

      await page.goto("/");
      await expect(page).toHaveURL(/\/dashboard/);
      await expectDashboardLoaded(page);
      await expect(page.getByText("POS Sales by Outlet")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Generate Global Report" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
      expect([...forbiddenApiPaths]).toEqual([]);
    });
  });

  test.describe("finance", () => {
    test.use({ storageState: storageStatePath("finance") });

    test("finance dashboard loads only permitted data", async ({ page }) => {
      const forbiddenApiPaths = watchForbiddenApiResponses(page);

      await page.goto("/dashboard");
      await expectDashboardLoaded(page);
      await expect(page.getByText("POS Sales by Outlet")).toBeVisible();
      expect([...forbiddenApiPaths]).toEqual([]);
    });
  });

  test.describe("warehouse", () => {
    test.use({ storageState: storageStatePath("warehouse") });

    test("warehouse accesses its operational routes without permission leaks", async ({ page }) => {
      const forbiddenApiPaths = watchForbiddenApiResponses(page);
      const routes = [
        ["/dashboard/transfers", "Stock Transfers"],
        ["/dashboard/stock", "Stock Control"],
        ["/dashboard/purchase-orders", "Purchase Orders"],
        ["/dashboard/vendors", "Vendors"],
        ["/dashboard/items", "Items"],
        ["/dashboard/warehouses", "Warehouses"],
        ["/dashboard/locations", "Locations"],
      ] as const;

      await page.goto("/");
      await expect(page).toHaveURL(/\/dashboard\/transfers/);

      for (const [route, heading] of routes) {
        await page.goto(route);
        await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      }

      await page.goto("/dashboard");
      await expectDashboardLoaded(page);
      await expect(page.getByText("POS Sales by Outlet")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Generate Global Report" }),
      ).toHaveCount(0);
      expect([...forbiddenApiPaths]).toEqual([]);
    });
  });
});
