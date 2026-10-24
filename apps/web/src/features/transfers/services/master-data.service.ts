import { apiClient } from "@/shared/lib/api/client";

import type {
  ItemOption,
  LocationOption,
  WarehouseOption,
} from "../types/transfer.types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value
    : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function extractArray(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [
    payload.data,
    payload.items,
    payload.rows,
    payload.results,
    payload.warehouses,
    payload.locations,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }

    if (isRecord(candidate)) {
      const nested = extractArray(candidate);

      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

function normalizeWarehouse(row: UnknownRecord): WarehouseOption | null {
  const id = stringValue(row.id);
  const code =
    stringValue(row.warehouse_code) ||
    stringValue(row.code);
  const name =
    stringValue(row.warehouse_name) ||
    stringValue(row.name);

  if (!id || !code || !name) {
    return null;
  }

  return {
    id,
    code,
    name,
    address: stringValue(row.address),
    is_active: booleanValue(row.is_active) ?? true,
  };
}

function normalizeLocation(row: UnknownRecord): LocationOption | null {
  const id = stringValue(row.id);
  const code =
    stringValue(row.location_code) ||
    stringValue(row.code);
  const name =
    stringValue(row.location_name) ||
    stringValue(row.name);

  if (!id || !code || !name) {
    return null;
  }

  return {
    id,
    code,
    name,
    level:
      stringValue(row.location_type) ||
      stringValue(row.level),
    warehouse_id: stringValue(row.warehouse_id),
    parent_id: stringValue(row.parent_id),
    is_active: booleanValue(row.is_active) ?? true,
  };
}

function normalizeItem(row: UnknownRecord): ItemOption | null {
  const id = stringValue(row.id);
  const code =
    stringValue(row.item_code) ||
    stringValue(row.code);
  const name =
    stringValue(row.item_name) ||
    stringValue(row.name);

  if (!id || !code || !name) {
    return null;
  }

  const unit = isRecord(row.unit) ? row.unit : null;

  return {
    id,
    item_code: code,
    item_name: name,
    unit_code:
      stringValue(row.unit_code) ||
      stringValue(unit?.code),
    unit_name:
      stringValue(row.unit_name) ||
      stringValue(unit?.name),
    is_active: booleanValue(row.is_active) ?? true,
  };
}

export const masterDataService = {
  async getWarehouses(): Promise<WarehouseOption[]> {
    const response = await apiClient.get("/warehouses", {
      params: {
        limit: 100,
      },
    });

    return extractArray(response.data)
      .map(normalizeWarehouse)
      .filter(
        (warehouse): warehouse is WarehouseOption =>
          warehouse !== null && warehouse.is_active,
      );
  },

  async getLocations(): Promise<LocationOption[]> {
    const response = await apiClient.get("/locations", {
      params: {
        limit: 100,
      },
    });

    return extractArray(response.data)
      .map(normalizeLocation)
      .filter(
        (location): location is LocationOption =>
          location !== null && location.is_active,
      );
  },

  async getItems(): Promise<ItemOption[]> {
    const response = await apiClient.get("/items", {
      params: {
        page: 1,
        limit: 100,
      },
    });

    return extractArray(response.data)
      .map(normalizeItem)
      .filter(
        (item): item is ItemOption =>
          item !== null && item.is_active,
      );
  },
};
