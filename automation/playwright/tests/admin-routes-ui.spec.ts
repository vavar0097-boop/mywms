import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  expectUsablePage,
  watchConsoleErrors,
} from "../src/ui-health";

const adminRoutes = [
  ["/dashboard", /Dashboard/],
  ["/dashboard/finance", /Finance/],
  ["/dashboard/vendors", /Vendors/],
  ["/dashboard/purchase-orders", /Purchase Orders/],
  ["/dashboard/items", /Items/],
  ["/dashboard/warehouses", /Warehouses/],
  ["/dashboard/locations", /Locations/],
  ["/dashboard/stock", "Stock Control"],
  ["/dashboard/transfers", /Stock Transfers/],
  ["/dashboard/settings", /Global Settings/],
  ["/dashboard/audit-logs", /Audit Logs/],
] as const;

test.describe("admin route UI health", () => {
  for (const [route, heading] of adminRoutes) {
    test(`${route} renders without blank screen or console errors`, async ({
      page,
    }) => {
      const consoleHealth = watchConsoleErrors(page);

      await page.goto(route);
      await expectUsablePage(page, heading);
      await expectNoHorizontalOverflow(page);
      consoleHealth.expectClean();
    });
  }

  test("dashboard remains usable on mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/dashboard");
    await expectUsablePage(page, /Dashboard/);
    await expect(page.getByLabel("Open navigation")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
