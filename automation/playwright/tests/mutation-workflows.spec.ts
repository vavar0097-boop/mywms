import { expect, test } from "@playwright/test";

import { authHeaders, loginApi, rowsFromPayload } from "../src/api";
import {
  allowMutation,
  credentialsFor,
  missingCredentialsMessage,
} from "../src/env";

type ItemRow = {
  id: string;
  item_code: string;
  item_name: string;
};

type PosMenuRow = {
  id: string;
  menu_code: string;
  menu_name: string;
};

test.describe("optional mutation workflows", () => {
  test("creates POS menu, saves BOM, verifies UI, and retains QA records", async ({
    page,
  }) => {
    test.skip(
      !allowMutation,
      "Set WMS_ALLOW_MUTATION=true for create/update/delete workflow tests",
    );

    const credentials = credentialsFor("admin");
    test.skip(!credentials, missingCredentialsMessage("admin"));

    const { api, cookie } = await loginApi(credentials!);
    const headers = authHeaders(cookie);
    let createdMenuId: string | null = null;

    try {
      const itemResponse = await api.get("items?limit=2", { headers });
      expect(itemResponse.ok(), await itemResponse.text()).toBeTruthy();

      const items = rowsFromPayload<ItemRow>(await itemResponse.json());
      test.skip(items.length < 1, "At least one item is required for BOM test");

      const unique = Date.now();
      const createResponse = await api.post("settings/pos-menu", {
        headers,
        data: {
          item_id: null,
          menu_code: `QA-PW-${unique}`,
          menu_name: `QA Playwright Menu ${unique}`,
          category: "QA Automation",
          price: 12345,
          is_visible: false,
          is_available: true,
          sort_order: 999,
        },
      });
      expect(createResponse.ok(), await createResponse.text()).toBeTruthy();

      const createdPayload = await createResponse.json();
      const createdMenu = createdPayload.data as PosMenuRow;
      createdMenuId = createdMenu.id;

      const bomResponse = await api.put(
        `settings/pos-menu/${createdMenuId}/bom`,
        {
          headers,
          data: {
            components: [
              {
                component_item_id: items[0].id,
                quantity_per_menu: 1.25,
                tolerance_percent: 2.5,
                is_fixed_quantity: false,
                notes: "Playwright QA recipe",
              },
            ],
          },
        },
      );
      expect(bomResponse.ok(), await bomResponse.text()).toBeTruthy();

      const bomRows = rowsFromPayload(await bomResponse.json());
      expect(bomRows).toHaveLength(1);

      await page.goto("/login");
      await page
        .getByPlaceholder("Enter your username")
        .fill(credentials!.username);
      await page
        .getByPlaceholder("Enter your password")
        .fill(credentials!.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);

      await page.goto("/dashboard/settings");
      await page.getByPlaceholder("Search POS menu").fill(createdMenu.menu_code);
      await expect(page.getByText(createdMenu.menu_name)).toBeVisible();

      await page.getByRole("button", { name: "Edit BOM" }).first().click();
      await expect(
        page.getByRole("heading", { name: `BOM - ${createdMenu.menu_name}` }),
      ).toBeVisible();
      await expect(page.getByPlaceholder("Notes")).toHaveValue(
        "Playwright QA recipe",
      );
    } finally {
      await api.dispose();
    }
  });
});
