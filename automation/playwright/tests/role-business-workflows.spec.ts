import { expect, test, type APIResponse } from "@playwright/test";

import { authHeaders, loginApi, rowsFromPayload } from "../src/api";
import {
  allowMutation,
  credentialsFor,
  missingCredentialsMessage,
  purchaseReceiveRpcReady,
} from "../src/env";

type Location = {
  id: string;
  location_type: string;
  is_active: boolean;
};

type StockRow = {
  item_id: string;
  location_id: string;
  quantity: number | string;
  items?: { item_name?: string };
};

type PurchaseOrder = {
  id: string;
  po_no: string;
  status: string;
  destination_location_id: string;
  purchase_order_items: Array<{
    id: string;
    item_id: string;
    qty_ordered: number | string;
    qty_received: number | string;
  }>;
};

type DailyPurchase = {
  id: string;
  status: string;
  total_amount: number | string;
};

async function payload<T>(response: APIResponse): Promise<T> {
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  let result: unknown = body;
  for (let depth = 0; depth < 3; depth += 1) {
    if (
      typeof result !== "object" ||
      result === null ||
      !("data" in result)
    ) {
      break;
    }
    result = (result as { data: unknown }).data;
  }
  return result as T;
}

async function quantityAt(
  api: Awaited<ReturnType<typeof loginApi>>["api"],
  headers: Record<string, string>,
  itemId: string,
  locationId: string,
) {
  const rows = await api
    .get(
      `stocks/current?item_id=${itemId}&location_id=${locationId}&limit=100`,
      { headers },
    )
    .then(async (response) => rowsFromPayload<StockRow>(await response.json()));
  return Number(rows.find((row) => row.item_id === itemId)?.quantity ?? 0);
}

async function restoreQuantity(
  api: Awaited<ReturnType<typeof loginApi>>["api"],
  headers: Record<string, string>,
  itemId: string,
  locationId: string,
  baseline: number,
) {
  const current = await quantityAt(api, headers, itemId, locationId);
  const delta = baseline - current;
  if (Math.abs(delta) < 0.000001) return;

  const response = await api.post("stocks/adjustment", {
    headers,
    data: {
      item_id: itemId,
      location_id: locationId,
      quantity: Math.abs(delta),
      stock_effect: delta > 0 ? "PLUS" : "MINUS",
      remarks: "Playwright QA purchase receipt stock baseline restoration",
    },
  });
  await payload(response);
  expect(await quantityAt(api, headers, itemId, locationId)).toBeCloseTo(
    baseline,
    4,
  );
}

test.describe("role business workflows", () => {
  test("finance records and reads a standalone payment entry", async () => {
    test.skip(
      !allowMutation,
      "Set WMS_ALLOW_MUTATION=true only for the approved prototype environment",
    );

    const credentials = credentialsFor("finance");
    test.skip(!credentials, missingCredentialsMessage("finance"));
    const { api, cookie } = await loginApi(credentials!);
    const headers = authHeaders(cookie) ?? {};
    const marker = `Playwright QA payment ${Date.now()}`;

    try {
      const createResponse = await api.post("finance/transactions", {
        headers,
        data: {
          type: "EXPENSE",
          category: "QA Purchase Payment",
          description: marker,
          amount: 1,
          payment_method: "CASH",
        },
      });
      const transaction = await payload<{ id: string; amount: number }>(createResponse);
      expect(Number(transaction.amount)).toBe(1);

      const listResponse = await api.get(
        `finance/transactions?search=${encodeURIComponent(marker)}&limit=10`,
        { headers },
      );
      const rows = await payload<Array<{ id: string; description: string }>>(listResponse);
      expect(rows.some((row) => row.id === transaction.id)).toBe(true);
      console.log(`Retained QA payment transaction: ${marker} (${transaction.id})`);
    } finally {
      await api.dispose();
    }
  });

  test("finance records a purchase receipt, pays, and approves it", async () => {
    test.skip(
      !allowMutation,
      "Set WMS_ALLOW_MUTATION=true only for the approved prototype environment",
    );

    const credentials = credentialsFor("finance");
    test.skip(!credentials, missingCredentialsMessage("finance"));
    const { api, cookie } = await loginApi(credentials!);
    const headers = authHeaders(cookie) ?? {};
    const vendorName = `Playwright QA receipt ${Date.now()}`;
    const amount = 125;

    try {
      const createResponse = await api.post("finance/daily-purchases", {
        headers,
        data: {
          purchase_date: new Date().toISOString().slice(0, 10),
          vendor_name: vendorName,
          status: "DRAFT_AI",
          total_amount: amount,
          items: [{
            item_name: "Prototype receipt test item",
            qty: 1,
            unit: "pcs",
            unit_price: amount,
            subtotal: amount,
            category: "QA Purchase Receipt",
          }],
        },
      });
      const draft = await payload<DailyPurchase>(createResponse);
      expect(draft.status).toBe("DRAFT_AI");
      expect(Number(draft.total_amount)).toBe(amount);

      const approveResponse = await api.post(
        `finance/daily-purchases/${draft.id}/approve`,
        { headers },
      );
      const approved = await payload<DailyPurchase>(approveResponse);
      expect(approved.status).toBe("APPROVED");

      const transactionsResponse = await api.get(
        `finance/transactions?search=${encodeURIComponent(vendorName)}&limit=20`,
        { headers },
      );
      const transactions = await payload<Array<{
        type: string;
        category: string;
        amount: number | string;
      }>>(transactionsResponse);
      expect(transactions.some((transaction) =>
        transaction.type === "EXPENSE" &&
        transaction.category === "Daily Store Purchase" &&
        Number(transaction.amount) === amount,
      )).toBe(true);
      console.log(`Retained QA daily purchase ${vendorName} (${draft.id})`);
    } finally {
      await api.dispose();
    }
  });

  test("finance creates purchase receipt and warehouse matches and receives it into stock", async () => {
    test.skip(
      !allowMutation,
      "Set WMS_ALLOW_MUTATION=true only for the approved prototype environment",
    );
    test.skip(
      !purchaseReceiveRpcReady,
      "The deployed API currently calls increment_po_item_received_qty, which is missing from the database schema cache; enable this only after applying the migration and refreshing PostgREST schema cache",
    );

    const financeCredentials = credentialsFor("finance");
    const warehouseCredentials = credentialsFor("warehouse");
    test.skip(!financeCredentials, missingCredentialsMessage("finance"));
    test.skip(!warehouseCredentials, missingCredentialsMessage("warehouse"));

    const finance = await loginApi(financeCredentials!);
    const warehouse = await loginApi(warehouseCredentials!);
    const financeHeaders = authHeaders(finance.cookie) ?? {};
    const warehouseHeaders = authHeaders(warehouse.cookie) ?? {};
    let purchaseOrderId: string | null = null;
    let itemId: string | null = null;
    let destinationId: string | null = null;
    let baseline = 0;
    let receiptCreated = false;

    try {
      const [locationsResponse, stockResponse] = await Promise.all([
        warehouse.api.get("locations?limit=100", { headers: warehouseHeaders }),
        warehouse.api.get("stocks/current?limit=100", { headers: warehouseHeaders }),
      ]);
      const locations = rowsFromPayload<Location>(await locationsResponse.json());
      const stocks = rowsFromPayload<StockRow>(await stockResponse.json());
      expect(locationsResponse.ok()).toBeTruthy();
      expect(stockResponse.ok()).toBeTruthy();

      const destination = locations.find(
        (location) => location.is_active && location.location_type === "BIN",
      );
      expect(destination, "An active warehouse BIN is required").toBeTruthy();

      const stockItem = stocks.find(
        (row) => row.location_id === destination!.id && Number(row.quantity) > 0,
      );
      expect(stockItem, "A stocked QA item is required at the receiving BIN").toBeTruthy();
      itemId = stockItem!.item_id;
      destinationId = destination!.id;
      baseline = await quantityAt(
        finance.api,
        financeHeaders,
        itemId,
        destinationId,
      );

      const createResponse = await finance.api.post("purchase-orders", {
        headers: financeHeaders,
        data: {
          vendor_name: "Playwright QA Supplier",
          order_date: new Date().toISOString().slice(0, 10),
          destination_location_id: destinationId,
          notes: `QA prototype receiving workflow ${Date.now()}`,
          source_type: "MANUAL",
          items: [{ item_id: itemId, qty_ordered: 1, unit_price: 1 }],
        },
      });
      const created = await payload<PurchaseOrder>(createResponse);
      purchaseOrderId = created.id;
      expect(created.status).toBe("DRAFT");

      const orderResponse = await finance.api.post(
        `purchase-orders/${purchaseOrderId}/order`,
        { headers: financeHeaders, data: { notes: "QA purchase confirmed" } },
      );
      const ordered = await payload<PurchaseOrder>(orderResponse);
      expect(ordered.status).toBe("ORDERED");

      const poItem = ordered.purchase_order_items[0];
      expect(poItem).toBeTruthy();
      const receiveResponse = await warehouse.api.post(
        `purchase-orders/${purchaseOrderId}/receive`,
        {
          headers: warehouseHeaders,
          data: {
            notes: `Warehouse count matched QA receipt ${ordered.po_no}`,
            items: [{ purchase_order_item_id: poItem.id, qty_received: 1 }],
          },
        },
      );
      const received = await payload<PurchaseOrder>(receiveResponse);
      receiptCreated = true;
      expect(received.status).toBe("RECEIVED");
      expect(Number(received.purchase_order_items[0].qty_received)).toBe(1);
      expect(
        await quantityAt(finance.api, financeHeaders, itemId, destinationId),
      ).toBeCloseTo(baseline + 1, 4);

      await restoreQuantity(
        warehouse.api,
        warehouseHeaders,
        itemId,
        destinationId,
        baseline,
      );
    } finally {
      if (itemId && destinationId) {
        await restoreQuantity(
          warehouse.api,
          warehouseHeaders,
          itemId,
          destinationId,
          baseline,
        );
      }

      if (purchaseOrderId && !receiptCreated) {
        const cancelResponse = await finance.api.post(
          `purchase-orders/${purchaseOrderId}/cancel`,
          {
            headers: financeHeaders,
            data: { notes: "Cancelled by Playwright QA cleanup" },
          },
        );
        if (!cancelResponse.ok()) {
          throw new Error(
            `Unable to cancel unfinished QA purchase order (HTTP ${cancelResponse.status()})`,
          );
        }
      }

      await finance.api.dispose();
      await warehouse.api.dispose();
    }
  });

  test("finance can view cashier settlement records", async () => {
    const credentials = credentialsFor("finance");
    test.skip(!credentials, missingCredentialsMessage("finance"));
    const { api, cookie } = await loginApi(credentials!);

    try {
      const response = await api.get("finance/cashier-settlements?limit=100", {
        headers: authHeaders(cookie),
      });
      const settlements = await payload<Array<{ status: string }>>(response);
      expect(Array.isArray(settlements)).toBe(true);
      expect(settlements.every((row) => ["OPEN", "CLOSED"].includes(row.status))).toBe(true);
    } finally {
      await api.dispose();
    }
  });
});
