import { apiClient } from "@/shared/lib/api/client";

import type {
  CreateTransferPayload,
  Transfer,
  TransferAction,
} from "../types/transfer.types";

function unwrapApiPayload<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

function normalizeTransferList(payload: unknown): Transfer[] {
  const unwrapped = unwrapApiPayload<unknown>(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped.map(normalizeTransfer);
  }

  if (unwrapped && typeof unwrapped === "object") {
    const value = unwrapped as {
      transfers?: Transfer[];
      rows?: Transfer[];
      items?: Transfer[];
      data?: Transfer[];
    };

    if (Array.isArray(value.transfers)) return value.transfers.map(normalizeTransfer);
    if (Array.isArray(value.rows)) return value.rows.map(normalizeTransfer);
    if (Array.isArray(value.items)) return value.items.map(normalizeTransfer);
    if (Array.isArray(value.data)) return value.data.map(normalizeTransfer);
  }

  return [];
}

function normalizeTransfer(payload: unknown): Transfer {
  const row = payload as Transfer;
  const items = row.items ?? row.transfer_items ?? [];

  return {
    ...row,
    source_warehouse_code:
      row.source_warehouse_code ?? row.source_warehouse?.code,
    source_warehouse_name:
      row.source_warehouse_name ?? row.source_warehouse?.name,
    destination_warehouse_code:
      row.destination_warehouse_code ?? row.destination_warehouse?.code,
    destination_warehouse_name:
      row.destination_warehouse_name ?? row.destination_warehouse?.name,
    source_location_code:
      row.source_location_code ?? row.source_location?.code,
    source_location_name:
      row.source_location_name ?? row.source_location?.name,
    destination_location_code:
      row.destination_location_code ?? row.destination_location?.code,
    destination_location_name:
      row.destination_location_name ?? row.destination_location?.name,
    items: items.map((item) => ({
      ...item,
      item_code: item.item_code ?? item.items?.item_code,
      item_name: item.item_name ?? item.items?.item_name,
      unit_code: item.unit_code ?? item.items?.units?.code,
      unit_name: item.unit_name ?? item.items?.units?.name,
      qty_picked: item.qty_picked ?? item.qty_shipped,
    })),
    events: row.events ?? row.transfer_events ?? [],
  };
}

function normalizeTransferDetail(payload: unknown): Transfer {
  const unwrapped = unwrapApiPayload<unknown>(payload);

  if (unwrapped && typeof unwrapped === "object") {
    const value = unwrapped as {
      transfer?: Transfer;
      data?: Transfer;
    };

    if (value.transfer) return value.transfer;
    if (value.data && !Array.isArray(value.data)) return value.data;
  }

  return normalizeTransfer(unwrapped);
}

export const transferService = {
  async getTransfers() {
    const response = await apiClient.get("/transfers");

    return normalizeTransferList(response.data);
  },

  async getTransferById(id: string) {
    const response = await apiClient.get(`/transfers/${id}`);

    return normalizeTransferDetail(response.data);
  },

  async createTransfer(payload: CreateTransferPayload) {
    const response = await apiClient.post("/transfers", payload);

    return normalizeTransferDetail(response.data);
  },

  async runAction(id: string, action: TransferAction) {
    const response = await apiClient.post(
      `/transfers/${id}/${action}`,
      {
        remarks: "",
      },
    );

    return normalizeTransferDetail(response.data);
  },
};