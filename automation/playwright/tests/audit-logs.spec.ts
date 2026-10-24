import { expect, test } from "@playwright/test";

import { storageStatePath } from "../src/env";

test.describe("audit logs", () => {
  test.use({ storageState: storageStatePath("finance") });

  test("audit log page renders real table shell", async ({ page }) => {
    await page.goto("/dashboard/audit-logs");

    await expect(
      page.getByRole("heading", { name: "Audit Logs" }),
    ).toBeVisible();
    await expect(page.getByText("Operational Events")).toBeVisible();
    await expect(page.getByPlaceholder("Search action or module")).toBeVisible();
  });
});
