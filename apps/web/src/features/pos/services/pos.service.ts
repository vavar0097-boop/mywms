import { apiClient } from "@/shared/lib/api/client";
import { LocationRow } from "@/features/master-data/services/master-data-page.service";

type UnknownRecord = Record<string, unknown>;

export type CashierSessionSummary = {
  cashier_session_id: string;
  session_no: string;
  cashier_id: string;
  location_id: string;
  shift_name: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number | string;
  total_sales_count: number;
  total_sales: number | string;
  cash_sales: number | string;
  noncash_sales: number | string;
  total_expenses: number | string;
  total_deposits: number | string;
  calculated_expected_cash: number | string;
  actual_cash?: number | string | null;
  cash_difference?: number | string | null;
};

export type PosMenuItem = {
  id: string;
  item_id: string | null;
  menu_code: string;
  menu_name: string;
  category?: string | null;
  price: number | string;
  is_visible: boolean;
  is_available: boolean;
  sort_order: number;
  current_stock?: number | string | null;
  is_low_stock?: boolean;
  items?: {
    id: string;
    item_code: string;
    item_name: string;
    units?: {
      code?: string | null;
      name?: string | null;
    } | null;
  } | null;
};

export type PosSalePayload = {
  items: Array<{
    menu_item_id: string;
    quantity: number;
  }>;
  payment_method: "CASH" | "NONCASH";
  paid_amount: number;
  reference_no?: string | null;
};

export type PosSaleResult = {
  sale_id: string;
  sale_no: string;
  cashier_session_id: string;
  subtotal: number;
  grand_total: number;
  payment_method: "CASH" | "NONCASH";
  paid_amount: number;
  change_amount: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function unwrap<T>(payload: unknown): T {
  if (isRecord(payload) && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export const posService = {
  async getActiveSession() {
    const response = await apiClient.get("/cashier-sessions/active");

    return unwrap<CashierSessionSummary | null>(response.data);
  },

  async openSession(payload: {
    location_id: string;
    shift_name: string;
    opening_cash: number;
  }) {
    const response = await apiClient.post(
      "/cashier-sessions/open",
      payload,
    );

    return unwrap<CashierSessionSummary>(response.data);
  },

  async closeSession(
    sessionId: string,
    payload: {
      actual_cash: number;
      notes?: string | null;
    },
  ) {
    const response = await apiClient.post(
      `/cashier-sessions/${sessionId}/close`,
      payload,
    );

    return unwrap<CashierSessionSummary>(response.data);
  },

  async createExpense(payload: {
    expense_category: string;
    amount: number;
    reason: string;
    photo_url?: string | null;
  }) {
    const response = await apiClient.post(
      "/cashier-sessions/expenses",
      payload,
    );

    return unwrap<unknown>(response.data);
  },

  async createDeposit(payload: {
    amount: number;
    received_by: string;
    photo_url?: string | null;
    notes?: string | null;
  }) {
    const response = await apiClient.post(
      "/cashier-sessions/deposits",
      payload,
    );

    return unwrap<unknown>(response.data);
  },

  async getOutletLocations() {
    const response = await apiClient.get("/pos/outlets");

    const body = unwrap<unknown>(response.data);

    return Array.isArray(body) ? (body as LocationRow[]) : [];
  },

  async getMenu(search?: string) {
    const response = await apiClient.get("/pos/menu", {
      params: {
        limit: 200,
        ...(search?.trim() ? { search: search.trim() } : {}),
      },
    });

    const body = unwrap<unknown>(response.data);

    return Array.isArray(body) ? (body as PosMenuItem[]) : [];
  },

  async createSale(payload: PosSalePayload) {
    const response = await apiClient.post("/pos/sales", payload);

    return unwrap<PosSaleResult>(response.data);
  },
};
