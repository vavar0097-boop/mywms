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

    test("finance sees only finance workspace", async ({ page }) => {
      const forbiddenApiPaths = watchForbiddenApiResponses(page);

      await page.goto("/");
      await expect(page).toHaveURL(/\/dashboard\/finance/);
      await expect(page.getByRole("heading", { name: "Finance" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Finance" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Transfers" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Purchase Orders" })).toHaveCount(0);
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
        ["/dashboard/stock-opname", "Stock Opname Mingguan"],
        ["/dashboard/purchase-orders", "Purchase Orders"],
      ] as const;

      await page.goto("/");
      await expect(page).toHaveURL(/\/dashboard\/transfers/);

      for (const [route, heading] of routes) {
        await page.goto(route);
        await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      }

      await page.goto("/dashboard/vendors");
      await expect(page).toHaveURL(/\/dashboard\/transfers/);
      await expect(page.getByRole("link", { name: "Stock Opname" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Finance" })).toHaveCount(0);
      expect([...forbiddenApiPaths]).toEqual([]);
    });
  });

  test.describe("supervisor", () => {
    test.use({ storageState: storageStatePath("supervisor") });

    test("supervisor sees outlet requests and daily purchase reporting only", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/dashboard\/transfers/);
      await expect(page.getByRole("link", { name: "Transfers" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Stock" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Purchase Orders" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Laporan Belanja Harian" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Finance" })).toHaveCount(0);

      await page.goto("/dashboard/transfers/new");
      await expect(page.getByRole("heading", { name: "Request Barang ke Gudang" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Kirim Request" })).toBeVisible();

      await page.goto("/dashboard/daily-purchases");
      await expect(page.getByRole("heading", { name: "Laporan Belanja Harian" })).toBeVisible();
    });
  });

  test.describe("cashier", () => {
    test.use({ storageState: storageStatePath("cashier") });

    test("cashier receives outlet goods from the three-dot menu", async ({ page }) => {
      await page.goto("/pos");
      await page.getByRole("button", { name: "Open cashier menu" }).click();
      await expect(page.getByRole("link", { name: "Barang Masuk" })).toBeVisible();
      await page.getByRole("link", { name: "Barang Masuk" }).click();
      await expect(page).toHaveURL(/\/dashboard\/transfers/);
      await expect(page.getByRole("link", { name: "Kembali ke Kasir" })).toBeVisible();
    });
  });
});
