import { apiClient } from "@/shared/lib/api/client";

type UnknownRecord = Record<string, unknown>;

export type PosMenuItem = {
  id: string;
  item_id?: string | null;
  menu_code: string;
  menu_name: string;
  category?: string | null;
  price: number | string;
  is_visible: boolean;
  is_available: boolean;
  sort_order: number;
  items?: {
    id: string;
    item_code: string;
    item_name: string;
  } | null;
  bom_components?: PosMenuBomComponent[];
};

export type PosMenuBomComponent = {
  id?: string;
  menu_item_id?: string;
  component_item_id: string;
  quantity_per_menu: number | string;
  tolerance_percent: number | string;
  is_fixed_quantity: boolean;
  notes?: string | null;
  component_item?: {
    id: string;
    item_code: string;
    item_name: string;
  } | null;
};

export type PosMenuBomPayload = {
  components: Array<{
    component_item_id: string;
    quantity_per_menu: number;
    tolerance_percent: number;
    is_fixed_quantity: boolean;
    notes?: string | null;
  }>;
};

export type PosMenuPayload = {
  item_id?: string | null;
  menu_code: string;
  menu_name: string;
  category?: string | null;
  price: number;
  is_visible: boolean;
  is_available: boolean;
  sort_order: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function unwrap(payload: unknown) {
  return isRecord(payload) && "data" in payload
    ? payload.data
    : payload;
}

function normalizeArray<T>(payload: unknown): T[] {
  const body = unwrap(payload);

  return Array.isArray(body) ? (body as T[]) : [];
}

export const posSettingsService = {
  async getMenuItems(params?: {
    search?: string;
    visible_only?: boolean;
    limit?: number;
  }) {
    const response = await apiClient.get("/settings/pos-menu", {
      params: {
        limit: params?.limit ?? 200,
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.visible_only
          ? { visible_only: "true" }
          : {}),
      },
    });

    return normalizeArray<PosMenuItem>(response.data);
  },

  async createMenuItem(payload: PosMenuPayload) {
    const response = await apiClient.post(
      "/settings/pos-menu",
      payload,
    );

    return response.data;
  },

  async updateMenuItem(id: string, payload: PosMenuPayload) {
    const response = await apiClient.put(
      `/settings/pos-menu/${id}`,
      payload,
    );

    return response.data;
  },

  async deleteMenuItem(id: string) {
    const response = await apiClient.delete(
      `/settings/pos-menu/${id}`,
    );

    return response.data;
  },

  async getBom(id: string) {
    const response = await apiClient.get(
      `/settings/pos-menu/${id}/bom`,
    );

    return normalizeArray<PosMenuBomComponent>(response.data);
  },

  async replaceBom(id: string, payload: PosMenuBomPayload) {
    const response = await apiClient.put(
      `/settings/pos-menu/${id}/bom`,
      payload,
    );

    return normalizeArray<PosMenuBomComponent>(response.data);
  },
};
