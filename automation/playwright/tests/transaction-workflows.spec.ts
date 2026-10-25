import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";

import { authHeaders, loginApi, rowsFromPayload } from "../src/api";
import { login } from "../src/auth";
import {
  allowMutation,
  credentialsFor,
  missingCredentialsMessage,
} from "../src/env";

type Warehouse = {
  id: string;
  is_active: boolean;
};

type Location = {
  id: string;
  warehouse_id: string;
  location_type: string;
  is_active: boolean;
};

type StockRow = {
  item_id: string;
  location_id: string;
  quantity: number | string;
};

type MenuItem = {
  id: string;
  item_id: string | null;
  menu_name: string;
  price: number | string;
  is_available: boolean;
  bom_components?: unknown[];
};

type Transfer = {
  id: string;
  status: string;
};

type Sale = {
  sale_id: string;
  sale_no: string;
  grand_total: number;
};

function unwrap(payload: unknown): unknown {
  let value = payload;

  for (let depth = 0; depth < 3; depth += 1) {
    if (
      typeof value !== "object" ||
      value === null ||
      !("data" in value)
    ) {
      break;
    }

    value = (value as { data: unknown }).data;
  }

  return value;
}

async function responseData<T>(response: APIResponse): Promise<T> {
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  return unwrap(body) as T;
}

async function listFrom<T>(response: APIResponse): Promise<T[]> {
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  return rowsFromPayload<T>(body);
}

async function currentQuantity(
  api: APIRequestContext,
  headers: Record<string, string>,
  itemId: string,
  locationId: string,
) {
  const response = await api.get(
    `stocks/current?item_id=${itemId}&location_id=${locationId}&limit=100`,
    { headers },
  );
  const rows = await listFrom<StockRow>(response);
  return Number(rows[0]?.quantity ?? 0);
}

test.describe("prototype transactional workflows", () => {
  test("warehouse completes a stock transfer and retains the resulting stock balances", async () => {
    test.skip(
      !allowMutation,
      "Set WMS_ALLOW_MUTATION=true only for the approved prototype test environment",
    );

    const credentials = credentialsFor("warehouse");
    test.skip(!credentials, missingCredentialsMessage("warehouse"));

    const { api, cookie } = await loginApi(credentials!);
    const headers = authHeaders(cookie) ?? {};
    const sourceBaselines = new Map<string, number>();
    const destinationBaselines = new Map<string, number>();
    let selectedItemId: string | null = null;
    let transferId: string | null = null;

    try {
      const [warehouses, locations, stocks] = await Promise.all([
        api.get("warehouses?limit=100", { headers }).then(listFrom<Warehouse>),
        api.get("locations?limit=100", { headers }).then(listFrom<Location>),
        api.get("stocks/current?limit=100", { headers }).then(listFrom<StockRow>),
      ]);
      const activeWarehouses = new Set(
        warehouses.filter((warehouse) => warehouse.is_active).map((warehouse) => warehouse.id),
      );
      const binLocations = locations.filter(
        (location) =>
          location.is_active &&
          location.location_type === "BIN" &&
          activeWarehouses.has(location.warehouse_id),
      );

      let candidate:
        | { itemId: string; source: Location; destination: Location }
        | undefined;

      for (const source of binLocations) {
        const sourceStock = stocks.find(
          (stock) =>
            stock.location_id === source.id &&
            Number(stock.quantity) >= 2,
        );
        if (!sourceStock) continue;

        const destination = binLocations.find(
          (location) =>
            location.id !== source.id &&
            location.warehouse_id !== source.warehouse_id,
        );
        if (destination) {
          candidate = {
            itemId: sourceStock.item_id,
            source,
            destination,
          };
          break;
        }
      }

      test.skip(!candidate, "Need stock in one BIN and a second active warehouse BIN");
      selectedItemId = candidate!.itemId;

      const sourceWarehouse = warehouses.find(
        (warehouse) => warehouse.id === candidate!.source.warehouse_id,
      );
      const destinationWarehouse = warehouses.find(
        (warehouse) => warehouse.id === candidate!.destination.warehouse_id,
      );
      expect(sourceWarehouse).toBeTruthy();
      expect(destinationWarehouse).toBeTruthy();

      const sourceBaseline = await currentQuantity(
        api,
        headers,
        selectedItemId,
        candidate!.source.id,
      );
      const destinationBaseline = await currentQuantity(
        api,
        headers,
        selectedItemId,
        candidate!.destination.id,
      );
      sourceBaselines.set(candidate!.source.id, sourceBaseline);
      destinationBaselines.set(candidate!.destination.id, destinationBaseline);

      const createResponse = await api.post("transfers", {
        headers,
        data: {
          source_warehouse_id: sourceWarehouse!.id,
          destination_warehouse_id: destinationWarehouse!.id,
          source_location_id: candidate!.source.id,
          destination_location_id: candidate!.destination.id,
          remarks: `Playwright QA transfer ${Date.now()}`,
          items: [{ item_id: selectedItemId, qty_requested: 1 }],
        },
      });
      const transfer = await responseData<Transfer>(createResponse);
      transferId = transfer.id;
      expect(transfer.status).toBe("DRAFT");

      for (const [action, expectedStatus] of [
        ["request", "REQUESTED"],
        ["pick", "PICKED"],
        ["dispatch", "IN_TRANSIT"],
        ["receive", "RECEIVED"],
      ] as const) {
        const actionResponse = await api.post(`transfers/${transferId}/${action}`, {
          headers,
          data: { remarks: "Playwright QA transfer workflow" },
        });
        const updated = await responseData<Transfer>(actionResponse);
        expect(updated.status).toBe(expectedStatus);
      }

      expect(
        await currentQuantity(api, headers, selectedItemId, candidate!.source.id),
      ).toBeCloseTo(sourceBaseline - 1, 4);
      expect(
        await currentQuantity(api, headers, selectedItemId, candidate!.destination.id),
      ).toBeCloseTo(destinationBaseline + 1, 4);
      console.log(
        `Retained QA transfer ${transferId}; item=${selectedItemId}; source=${candidate!.source.id} (${sourceBaseline - 1}); destination=${candidate!.destination.id} (${destinationBaseline + 1})`,
      );
    } finally {
      await api.dispose();
    }
  });

  test("cashier opens shift, sells through POS, deposits, prints receipt, and closes shift", async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(
      !allowMutation,
      "Set WMS_ALLOW_MUTATION=true only for the approved prototype test environment",
    );

    const cashierCredentials = credentialsFor("cashier");
    const warehouseCredentials = credentialsFor("warehouse");
    const adminCredentials = credentialsFor("admin");
    test.skip(!cashierCredentials, missingCredentialsMessage("cashier"));
    test.skip(!warehouseCredentials, missingCredentialsMessage("warehouse"));
    test.skip(!adminCredentials, missingCredentialsMessage("admin"));

    const cashier = await loginApi(cashierCredentials!);
    const cashierHeaders = authHeaders(cashier.cookie) ?? {};
    const warehouse = await loginApi(warehouseCredentials!);
    const warehouseHeaders = authHeaders(warehouse.cookie) ?? {};
    const admin = await loginApi(adminCredentials!);
    const adminHeaders = authHeaders(admin.cookie) ?? {};
    const financeCredentials = credentialsFor("finance");
    test.skip(!financeCredentials, missingCredentialsMessage("finance"));
    const finance = await loginApi(financeCredentials!);
    const financeHeaders = authHeaders(finance.cookie) ?? {};
    let openedSessionId: string | null = null;
    let saleId: string | null = null;
    let saleCompleted = false;
    let itemId: string | null = null;
    let locationId: string | null = null;
    let qaLocationId: string | null = null;
    let stockBaseline = 0;

    try {
      const activeResponse = await cashier.api.get("cashier-sessions/active", {
        headers: cashierHeaders,
      });
      const activeSession = await responseData<Record<string, unknown> | null>(
        activeResponse,
      );
      test.skip(
        Boolean(activeSession),
        "Cashier already has a shift; test will not reuse a pre-existing session",
      );

      const menu = await cashier.api
        .get("pos/menu?limit=100", { headers: cashierHeaders })
        .then(listFrom<MenuItem>);
      const menuItem = menu.find(
        (item) =>
          item.is_available &&
          item.item_id &&
          (item.bom_components?.length ?? 0) === 0 &&
          Number(item.price) > 0,
      );
      test.skip(!menuItem, "No available direct-stock POS menu item exists");

      const warehouses = await warehouse.api
        .get("warehouses?limit=100", { headers: warehouseHeaders })
        .then(listFrom<Warehouse>);
      const warehouseRow = warehouses.find((entry) => entry.is_active);
      test.skip(!warehouseRow, "No active warehouse is available for a temporary QA outlet");

      const locationResponse = await warehouse.api.post("locations", {
        headers: warehouseHeaders,
        data: {
          location_name: `QA POS outlet ${Date.now()}`,
          location_type: "OUTLET",
          warehouse_id: warehouseRow!.id,
          is_active: true,
        },
      });
      const location = await responseData<Location>(locationResponse);
      qaLocationId = location.id;

      itemId = menuItem!.item_id!;
      const initialStockResponse = await warehouse.api.post("stocks/initial", {
        headers: warehouseHeaders,
        data: {
          item_id: itemId,
          location_id: qaLocationId,
          quantity: 2,
          remarks: "Playwright QA cashier sale fixture",
        },
      });
      await responseData(initialStockResponse);

      await login(page, cashierCredentials!);
      await page.goto("/pos");
      await expect(page.getByRole("heading", { name: "Open Shift" })).toBeVisible();
      await page.getByLabel("Work Location").selectOption(qaLocationId);
      await page.locator("select").nth(1).selectOption("Pagi");
      await page.getByLabel("Opening Cash").fill("0");
      await page.getByRole("button", { name: "Start Selling" }).click();
      await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();

      const sessionResponse = await cashier.api.get("cashier-sessions/active", {
        headers: cashierHeaders,
      });
      const session = await responseData<Record<string, unknown>>(sessionResponse);
      openedSessionId = String(session.cashier_session_id ?? "") || null;
      expect(openedSessionId, "POS shift should have a session id").toBeTruthy();
      locationId = String(session.location_id ?? qaLocationId);
      expect(locationId).toBeTruthy();
      stockBaseline = await currentQuantity(
        warehouse.api,
        warehouseHeaders,
        itemId,
        locationId,
      );
      expect(stockBaseline).toBeGreaterThanOrEqual(1);

      const unitPrice = Number(menuItem!.price);
      await page.getByRole("button", { name: `Increase ${menuItem!.menu_name}` }).click();
      await expect(page.getByText(menuItem!.menu_name).first()).toBeVisible();
      await page.getByLabel("Cash Received").fill(String(unitPrice));
      await page.getByRole("button", { name: "Confirm Payment" }).click();
      await expect(page.getByText("CASH paid and recorded")).toBeVisible();
      await expect(page.getByRole("button", { name: "Print receipt" })).toBeVisible();
      const receiptText = await page.locator("aside").innerText();
      const saleNumber = receiptText.match(/SALE-[A-Z0-9-]+/)?.[0];
      expect(saleNumber, "POS receipt should show a generated sale number").toBeTruthy();
      const receiptPopup = page.waitForEvent("popup");
      await page.getByRole("button", { name: "Print receipt" }).click();
      const receiptPage = await receiptPopup;
      await expect(receiptPage.getByText("Enterprise WMS POS")).toBeVisible();
      await expect(receiptPage.getByText(saleNumber!)).toBeVisible();
      await receiptPage.close();

      const salesResponse = await finance.api.get("finance/pos-sales?status=PAID&limit=100", {
        headers: financeHeaders,
      });
      const sales = await listFrom<Sale & { id: string; sale_no: string }>(salesResponse);
      const sale = sales.find((entry) => entry.sale_no === saleNumber);
      expect(sale, "The UI checkout should persist a paid sale in finance").toBeTruthy();
      saleId = sale!.id;
      expect(Number(sale!.grand_total)).toBe(unitPrice);
      expect(
        await currentQuantity(warehouse.api, warehouseHeaders, itemId, locationId),
      ).toBeCloseTo(stockBaseline - 1, 4);
      saleCompleted = true;

      await page.getByRole("button", { name: "Open cashier menu" }).click();
      await page.getByRole("button", { name: "Setor Kas" }).click();
      await page.getByPlaceholder("Amount").fill(String(unitPrice));
      await page.getByPlaceholder("Received by").fill("Playwright QA Finance");
      await page.getByPlaceholder("Notes").fill(`Cashier close deposit for ${saleNumber}`);
      await page.getByRole("button", { name: "Save Deposit" }).click();

      const summaryResponse = await cashier.api.get("cashier-sessions/active", {
        headers: cashierHeaders,
      });
      const summary = await responseData<Record<string, unknown>>(summaryResponse);
      const actualCash = Number(summary.calculated_expected_cash ?? 0);
      await page.getByRole("button", { name: "Close Shift" }).click();
      const closeForm = page.locator("form").filter({ hasText: "Close Shift" });
      await closeForm.getByPlaceholder("Actual cash").fill(String(actualCash));
      await closeForm.getByPlaceholder("Notes").fill("Playwright QA end-of-day close");
      await closeForm.getByRole("button", { name: "Close Shift" }).click();
      await expect(page.getByRole("heading", { name: "Open Shift" })).toBeVisible();

      const closeResponse = await cashier.api.get("finance/cashier-settlements?status=CLOSED&limit=100", {
        headers: financeHeaders,
      });
      const closedRows = await listFrom<Record<string, unknown>>(closeResponse);
      const closed = closedRows.find((entry) => entry.cashier_session_id === openedSessionId);
      expect(closed?.status).toBe("CLOSED");
      expect(Number(closed?.total_deposits)).toBeGreaterThanOrEqual(unitPrice);
      expect(Number(closed?.total_sales)).toBe(unitPrice);
      saleCompleted = true;
      console.log(
        `Retained UI QA POS sale ${saleNumber} (${saleId}); closed cashier session=${openedSessionId}; outlet=${qaLocationId}; item=${itemId}; stock remaining=${stockBaseline - 1}`,
      );
    } finally {
      if (saleId && !saleCompleted) {
        const voidResponse = await admin.api.post(`pos/sales/${saleId}/void`, {
          headers: adminHeaders,
          data: { reason: "Playwright QA cleanup after incomplete sale test" },
        });
        if (voidResponse.ok()) saleCompleted = false;
      }

      let cleanupError: unknown;
      if (openedSessionId) {
        try {
          const openSettlementsResponse = await finance.api.get(
            "finance/cashier-settlements?status=OPEN&limit=100",
            { headers: financeHeaders },
          );
          const openSettlements = await listFrom<Record<string, unknown>>(
            openSettlementsResponse,
          );
          const openSession = openSettlements.find(
            (entry) => entry.cashier_session_id === openedSessionId,
          );
          if (openSession) {
            const closeResponse = await cashier.api.post(
              `cashier-sessions/${openedSessionId}/close`,
              {
                headers: cashierHeaders,
                data: {
                  actual_cash: Number(openSession.calculated_expected_cash ?? 0),
                  notes: "Playwright QA cleanup close",
                },
              },
            );
            await responseData(closeResponse);
          }
        } catch (error) {
          cleanupError = error;
        }
      }

      await cashier.api.dispose();
      await warehouse.api.dispose();
      await admin.api.dispose();
      await finance.api.dispose();
      if (cleanupError) throw cleanupError;
    }
  });
});
