import { apiClient } from "@/shared/lib/api/client";

import type {
  CreateAdjustmentPayload,
  CreateInitialStockPayload,
  CurrentStock,
  PaginatedResult,
  Pagination,
  StockLedger,
  StockQuery,
} from "../types/stock.types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizePaginatedResult<T>(
  payload: unknown,
): PaginatedResult<T> {
  const envelopeData =
    isRecord(payload) && "data" in payload
      ? payload.data
      : payload;

  const result = isRecord(envelopeData)
    ? envelopeData
    : {};

  const rows = Array.isArray(result.data)
    ? (result.data as T[])
    : [];

  const rawPagination = isRecord(result.pagination)
    ? result.pagination
    : {};

  const pagination: Pagination = {
    page: numberValue(rawPagination.page, 1),
    limit: numberValue(rawPagination.limit, 20),
    total: numberValue(rawPagination.total, rows.length),
    totalPages: numberValue(
      rawPagination.totalPages,
      rows.length > 0 ? 1 : 0,
    ),
  };

  return {
    data: rows,
    pagination,
  };
}

function cleanQuery(query: StockQuery) {
  return {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    ...(query.item_id ? { item_id: query.item_id } : {}),
    ...(query.location_id
      ? { location_id: query.location_id }
      : {}),
  };
}

export const stockService = {
  async getCurrentStocks(
    query: StockQuery,
  ): Promise<PaginatedResult<CurrentStock>> {
    const response = await apiClient.get("/stocks/current", {
      params: cleanQuery(query),
    });

    return normalizePaginatedResult<CurrentStock>(
      response.data,
    );
  },

  async getLedgers(
    query: StockQuery,
  ): Promise<PaginatedResult<StockLedger>> {
    const response = await apiClient.get("/stocks/ledgers", {
      params: cleanQuery(query),
    });

    return normalizePaginatedResult<StockLedger>(
      response.data,
    );
  },

  async createInitialStock(
    payload: CreateInitialStockPayload,
  ) {
    const response = await apiClient.post(
      "/stocks/initial",
      payload,
    );

    return response.data;
  },

  async createAdjustment(
    payload: CreateAdjustmentPayload,
  ) {
    const response = await apiClient.post(
      "/stocks/adjustment",
      payload,
    );

    return response.data;
  },
};
