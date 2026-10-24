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
    return unwrapped as Transfer[];
  }

  if (unwrapped && typeof unwrapped === "object") {
    const value = unwrapped as {
      transfers?: Transfer[];
      rows?: Transfer[];
      items?: Transfer[];
      data?: Transfer[];
    };

    if (Array.isArray(value.transfers)) return value.transfers;
    if (Array.isArray(value.rows)) return value.rows;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.data)) return value.data;
  }

  return [];
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

  return unwrapped as Transfer;
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