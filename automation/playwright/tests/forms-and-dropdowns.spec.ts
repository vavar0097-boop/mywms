import { expect, test } from "@playwright/test";

import { optionCount } from "../src/ui-health";

test.describe("forms, dropdowns, and non-destructive functional checks", () => {
  test("finance draft item calculates subtotal and total before save", async ({
    page,
  }) => {
    await page.goto("/dashboard/finance");

    await page.getByRole("button", { name: "Add Item" }).click();
    const saveDraft = page.getByRole("button", { name: "Save Draft" });
    await expect(saveDraft).toBeVisible();

    const row = saveDraft
      .locator("xpath=ancestor::div[contains(@class, 'overflow-x-auto')][1]")
      .locator("tbody tr")
      .first();
    await row.locator("input").nth(0).fill("QA Coffee Beans");
    await row.locator('input[type="number"]').nth(0).fill("2");
    await row.locator('input[type="number"]').nth(1).fill("15000");

    await expect(row).toContainText("Rp 30.000");
    await expect(page.getByText("Total Rp 30.000")).toBeVisible();
  });

  test("monthly report UI generates daily sheet summary without Google sync", async ({
    page,
  }) => {
    await page.goto("/dashboard/finance");

    const googleSync = page.getByLabel("Sync Google Sheet");
    if (await googleSync.isChecked()) {
      await googleSync.uncheck();
    }

    await page.getByRole("button", { name: "Generate Report" }).click();

    await expect(page.getByText("Sheets:")).toBeVisible();
    await expect(
      page.getByText(
        /Google: (Sync not requested|not synced|Google Sheets env is not configured)/i,
      ),
    ).toBeVisible();
  });

  test("item form exposes required master-data dropdowns", async ({ page }) => {
    await page.goto("/dashboard/items");
    await page.getByRole("button", { name: "Add Item" }).click();

    await expect(page.getByRole("heading", { name: "Add Item" })).toBeVisible();
    await expect(page.getByText("Item Type")).toBeVisible();
    await expect(page.getByText("Base Unit")).toBeVisible();

    await expect(optionCount(page, 'select:has(option[value="RAW_MATERIAL"])')).resolves.toBeGreaterThanOrEqual(4);
    await expect(optionCount(page, 'select:has(option:text("Select unit"))')).resolves.toBeGreaterThanOrEqual(1);
  });

  test("create transfer page loads route and item dropdowns", async ({ page }) => {
    await page.goto("/dashboard/transfers/new");

    await expect(page.getByRole("heading", { name: "Create Transfer" })).toBeVisible();
    await expect(page.getByText("Transfer Route")).toBeVisible();
    await expect(page.getByText("Flow Preview")).toBeVisible();

    await expect(optionCount(page, 'select:has(option:text("Select source warehouse"))')).resolves.toBeGreaterThanOrEqual(1);
    await expect(optionCount(page, 'select:has(option:text("Select destination warehouse"))')).resolves.toBeGreaterThanOrEqual(1);
    await expect(optionCount(page, 'select:has(option:text("Select item"))')).resolves.toBeGreaterThanOrEqual(1);
  });

  test("POS menu and BOM controls are reachable", async ({ page }) => {
    await page.goto("/dashboard/settings");

    await expect(page.getByRole("heading", { name: "Global Settings" })).toBeVisible();
    await page.getByRole("button", { name: "Add POS Menu" }).click();
    await expect(page.getByRole("heading", { name: "Add POS Menu" })).toBeVisible();
    await expect(page.getByPlaceholder("Menu code")).toBeVisible();
    await expect(page.getByPlaceholder("Menu name")).toBeVisible();
    await expect(page.getByText("Show in POS")).toBeVisible();

    await page.getByRole("button", { name: "Close POS menu form" }).click();

    const bomButton = page.getByRole("button", { name: "Edit BOM" }).first();
    if ((await bomButton.count()) === 0) {
      test.skip(true, "No POS menu row exists yet to open BOM modal");
    }

    await bomButton.click();
    await expect(page.getByRole("heading", { name: /BOM - / })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Component" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save BOM" })).toBeVisible();
  });
});
