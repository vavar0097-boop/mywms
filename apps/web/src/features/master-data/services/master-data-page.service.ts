import { apiClient } from "@/shared/lib/api/client";

type UnknownRecord = Record<string, unknown>;

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: Pagination;
};

export type ItemRow = {
  id: string;
  item_code: string;
  item_name: string;
  item_type?: string | null;
  base_unit_id?: string | null;
  barcode?: string | null;
  description?: string | null;
  min_stock?: number | string | null;
  reorder_qty?: number | string | null;
  default_vendor_name?: string | null;
  default_vendor_id?: string | null;
  is_active?: boolean | null;
  units?: {
    code?: string | null;
    name?: string | null;
  } | null;
};

export type UnitRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean | null;
};

export type ItemPayload = {
  item_name: string;
  item_type: string;
  base_unit_id: string;
  barcode?: string;
  description?: string;
  min_stock?: number;
  reorder_qty?: number;
  default_vendor_name?: string | null;
  default_vendor_id?: string | null;
  is_active?: boolean;
};

export type VendorRow = {
  id: string;
  vendor_code?: string | null;
  vendor_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type VendorPayload = {
  vendor_code?: string;
  vendor_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type WarehouseRow = {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  address?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type WarehousePayload = {
  warehouse_code?: string;
  warehouse_name: string;
  address?: string | null;
  is_active?: boolean;
};

export type LocationRow = {
  id: string;
  location_code: string;
  location_name: string;
  location_type?: string | null;
  warehouse_id?: string | null;
  parent_id?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type LocationPayload = {
  location_code?: string;
  location_name: string;
  location_type: string;
  warehouse_id: string;
  parent_id?: string | null;
  is_active?: boolean;
};

export type RoleRow = {
  id: string;
  name: string;
  description?: string | null;
};

export type UserRow = {
  id: string;
  username: string;
  full_name: string;
  is_active?: boolean | null;
  role_id?: string | null;
  role_name?: string | null;
  created_at?: string | null;
};

export type UserPayload = {
  username: string;
  full_name: string;
  password?: string;
  role_id: string;
  is_active?: boolean;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function unwrap(payload: unknown) {
  return isRecord(payload) && "data" in payload
    ? payload.data
    : payload;
}

function normalizePaginated<T>(
  payload: unknown,
): PaginatedResult<T> {
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

function normalizeArray<T>(payload: unknown): T[] {
  const body = unwrap(payload);

  if (Array.isArray(body)) {
    return body as T[];
  }

  if (!isRecord(body)) {
    return [];
  }

  for (const key of ["data", "items", "rows", "results"]) {
    const value = body[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

export const masterDataPageService = {
  async getItems(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const response = await apiClient.get("/items", {
      params,
    });

    return normalizePaginated<ItemRow>(response.data);
  },

  async getWarehouses(params?: {
    search?: string;
    limit?: number;
  }) {
    const response = await apiClient.get("/warehouses", {
      params: {
        limit: params?.limit ?? 100,
        ...(params?.search ? { search: params.search } : {}),
      },
    });

    return normalizeArray<WarehouseRow>(response.data);
  },

  async getLocations(params?: {
    search?: string;
    warehouse_id?: string;
    location_type?: string;
    limit?: number;
  }) {
    const response = await apiClient.get("/locations", {
      params: {
        limit: params?.limit ?? 200,
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.warehouse_id
          ? { warehouse_id: params.warehouse_id }
          : {}),
        ...(params?.location_type
          ? { location_type: params.location_type }
          : {}),
      },
    });

    return normalizeArray<LocationRow>(response.data);
  },

  async createWarehouse(payload: WarehousePayload) {
    const response = await apiClient.post("/warehouses", payload);

    return response.data;
  },

  async getVendors(params?: {
    search?: string;
    limit?: number;
  }) {
    const response = await apiClient.get("/vendors", {
      params: {
        limit: params?.limit ?? 200,
        ...(params?.search ? { search: params.search } : {}),
      },
    });

    return normalizeArray<VendorRow>(response.data);
  },

  async createVendor(payload: VendorPayload) {
    const response = await apiClient.post("/vendors", payload);

    return response.data;
  },

  async updateVendor(
    id: string,
    payload: Partial<VendorPayload>,
  ) {
    const response = await apiClient.put(`/vendors/${id}`, payload);

    return response.data;
  },

  async deleteVendor(id: string) {
    const response = await apiClient.delete(`/vendors/${id}`);

    return response.data;
  },

  async updateWarehouse(
    id: string,
    payload: Partial<WarehousePayload>,
  ) {
    const response = await apiClient.put(
      `/warehouses/${id}`,
      payload,
    );

    return response.data;
  },

  async deleteWarehouse(id: string) {
    const response = await apiClient.delete(`/warehouses/${id}`);

    return response.data;
  },

  async createLocation(payload: LocationPayload) {
    const response = await apiClient.post("/locations", payload);

    return response.data;
  },

  async updateLocation(
    id: string,
    payload: Partial<LocationPayload>,
  ) {
    const response = await apiClient.put(
      `/locations/${id}`,
      payload,
    );

    return response.data;
  },

  async deleteLocation(id: string) {
    const response = await apiClient.delete(`/locations/${id}`);

    return response.data;
  },

  async getUnits(params?: {
    search?: string;
    limit?: number;
  }) {
    const response = await apiClient.get("/units", {
      params: {
        limit: params?.limit ?? 100,
        ...(params?.search ? { search: params.search } : {}),
      },
    });

    return normalizeArray<UnitRow>(response.data);
  },

  async createItem(payload: ItemPayload) {
    const response = await apiClient.post("/items", payload);

    return response.data;
  },

  async updateItem(id: string, payload: Partial<ItemPayload>) {
    const response = await apiClient.put(`/items/${id}`, payload);

    return response.data;
  },

  async deleteItem(id: string) {
    const response = await apiClient.delete(`/items/${id}`);

    return response.data;
  },

  async getUsers(params?: {
    search?: string;
    limit?: number;
  }) {
    const response = await apiClient.get("/users", {
      params: {
        limit: params?.limit ?? 100,
        ...(params?.search ? { search: params.search } : {}),
      },
    });

    return normalizeArray<UserRow>(response.data);
  },

  async getRoles() {
    const response = await apiClient.get("/users/roles");

    return normalizeArray<RoleRow>(response.data);
  },

  async createUser(payload: UserPayload) {
    const response = await apiClient.post("/users", payload);

    return response.data;
  },

  async updateUser(id: string, payload: Partial<UserPayload>) {
    const response = await apiClient.put(`/users/${id}`, payload);

    return response.data;
  },

  async deleteUser(id: string) {
    const response = await apiClient.delete(`/users/${id}`);

    return response.data;
  },
};
