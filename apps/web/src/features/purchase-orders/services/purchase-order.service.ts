import { apiClient } from "@/shared/lib/api/client";

type UnknownRecord = Record<string, unknown>;

export type PurchaseOrderStatus =
  | "DRAFT"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type PurchaseOrderSourceType =
  | "MANUAL"
  | "SPREADSHEET"
  | "AI_PHOTO"
  | "AUTO_LOW_STOCK";

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PurchaseOrderItem = {
  id?: string;
  purchase_order_id?: string;
  item_id: string;
  item_code?: string | null;
  item_name?: string | null;
  name?: string | null;
  qty_ordered: number | string;
  qty_received?: number | string | null;
  unit_price?: number | string | null;
  notes?: string | null;
};

export type PurchaseOrder = {
  id: string;
  po_no?: string | null;
  vendor_id?: string | null;
  vendor_name: string;
  vendor_code?: string | null;
  vendor_phone?: string | null;
  vendor_email?: string | null;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date?: string | null;
  received_at?: string | null;
  destination_location_id: string;
  destination_location_code?: string | null;
  destination_location_name?: string | null;
  source_type?: PurchaseOrderSourceType | null;
  source_payload?: Record<string, unknown> | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items?: PurchaseOrderItem[];
  purchase_order_items?: PurchaseOrderItem[];
  purchase_receipts?: Array<{
    id: string;
    receipt_no?: string | null;
    received_at?: string | null;
    notes?: string | null;
    purchase_receipt_items?: Array<{
      id: string;
      item_id: string;
      qty_received: number | string;
      purchase_order_item_id: string;
    }>;
  }>;
  purchase_order_events?: Array<{
    id?: string;
    event_type?: string | null;
    notes?: string | null;
    created_at?: string | null;
  }>;
};

export type PurchaseOrderPayload = {
  vendor_name: string;
  vendor_id?: string | null;
  order_date: string;
  expected_date?: string | null;
  destination_location_id: string;
  source_type?: PurchaseOrderSourceType;
  source_payload?: Record<string, unknown> | null;
  notes?: string | null;
  items: Array<{
    item_id: string;
    qty_ordered: number;
    unit_price?: number;
    notes?: string | null;
  }>;
};

export type ReceivePurchaseOrderPayload = {
  receipt_date?: string;
  remarks?: string | null;
  items: Array<{
    purchase_order_item_id: string;
    qty_received: number;
    unit_price?: number;
    notes?: string | null;
  }>;
};

export type PurchaseOrderImportRow = {
  row_number: number;
  item_id?: string;
  item_code?: string | null;
  item_name: string;
  qty_ordered: number;
  unit_price: number;
  notes?: string | null;
  matched: boolean;
  errors: string[];
};

export type PurchaseOrderImportResult = {
  rows: PurchaseOrderImportRow[];
  matched_count: number;
  error_count: number;
};

export type LowStockCandidate = {
  item_id: string;
  item_code: string;
  item_name: string;
  min_stock: number;
  reorder_qty: number;
  current_qty: number;
  shortage_qty: number;
  suggested_qty: number;
  default_vendor_name?: string | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function unwrap(payload: unknown) {
  return isRecord(payload) && "data" in payload
    ? payload.data
    : payload;
}

function normalizePaginated<T>(
  payload: unknown,
): { data: T[]; pagination: Pagination } {
  const body = unwrap(payload);
  const result = isRecord(body) ? body : {};
  const rows = Array.isArray(result.data)
    ? (result.data as T[])
    : [];
  const rawPagination = isRecord(result.pagination)
    ? result.pagination
    : {};

  return {
    data: rows,
    pagination: {
      page: numberValue(rawPagination.page, 1),
      limit: numberValue(rawPagination.limit, rows.length || 20),
      total: numberValue(rawPagination.total, rows.length),
      totalPages: numberValue(
        rawPagination.totalPages,
        rows.length ? 1 : 0,
      ),
    },
  };
}

function normalizeOne<T>(payload: unknown): T {
  return unwrap(payload) as T;
}

export const purchaseOrderService = {
  async getPurchaseOrders(params: {
    page: number;
    limit: number;
    search?: string;
    status?: PurchaseOrderStatus | "";
  }) {
    const response = await apiClient.get("/purchase-orders", {
      params: {
        page: params.page,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    });

    return normalizePaginated<PurchaseOrder>(response.data);
  },

  async getPurchaseOrder(id: string) {
    const response = await apiClient.get(`/purchase-orders/${id}`);

    return normalizeOne<PurchaseOrder>(response.data);
  },

  async createPurchaseOrder(payload: PurchaseOrderPayload) {
    const response = await apiClient.post(
      "/purchase-orders",
      payload,
    );

    return normalizeOne<PurchaseOrder>(response.data);
  },

  async orderPurchaseOrder(id: string, notes?: string) {
    const response = await apiClient.post(
      `/purchase-orders/${id}/order`,
      { notes },
    );

    return normalizeOne<PurchaseOrder>(response.data);
  },

  async cancelPurchaseOrder(id: string, notes?: string) {
    const response = await apiClient.post(
      `/purchase-orders/${id}/cancel`,
      { notes },
    );

    return normalizeOne<PurchaseOrder>(response.data);
  },

  async receivePurchaseOrder(
    id: string,
    payload: ReceivePurchaseOrderPayload,
  ) {
    const response = await apiClient.post(
      `/purchase-orders/${id}/receive`,
      payload,
    );

    return normalizeOne<PurchaseOrder>(response.data);
  },

  async parseImport(rawText: string) {
    const response = await apiClient.post(
      "/purchase-orders/parse-import",
      {
        raw_text: rawText,
      },
    );

    return normalizeOne<PurchaseOrderImportResult>(response.data);
  },

  async getLowStockCandidates(locationId: string) {
    const response = await apiClient.get(
      "/purchase-orders/low-stock",
      {
        params: {
          location_id: locationId,
        },
      },
    );

    const body = unwrap(response.data);

    return Array.isArray(body) ? (body as LowStockCandidate[]) : [];
  },

  async generateLowStockPurchaseOrder(payload: {
    destination_location_id: string;
    vendor_name?: string | null;
    vendor_id?: string | null;
    notes?: string | null;
  }) {
    const response = await apiClient.post(
      "/purchase-orders/generate-low-stock",
      payload,
    );

    return normalizeOne<PurchaseOrder>(response.data);
  },
};
