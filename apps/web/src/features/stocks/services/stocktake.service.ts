import { apiClient } from "@/shared/lib/api/client";

export type StocktakeItem = {
  item_id: string;
  item_code_snapshot: string | null;
  item_name_snapshot: string;
  expected_quantity: number | string;
  counted_quantity: number | string | null;
};

export type Stocktake = {
  id: string;
  stocktake_no: string;
  location_id: string;
  status: "OPEN" | "COMPLETED";
  created_at: string;
  completed_at?: string | null;
  locations?: { code?: string; name?: string } | null;
  stocktake_items?: StocktakeItem[];
};

function unwrap<T>(value: unknown): T {
  if (typeof value === "object" && value !== null && "data" in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export const stocktakeService = {
  async list() {
    return unwrap<Stocktake[]>((await apiClient.get("/stocks/opnames")).data);
  },
  async get(id: string) {
    return unwrap<Stocktake>((await apiClient.get(`/stocks/opnames/${id}`)).data);
  },
  async create(location_id: string) {
    return unwrap<Stocktake>((await apiClient.post("/stocks/opnames", { location_id })).data);
  },
  async complete(id: string, counts: Array<{ item_id: string; counted_quantity: number }>) {
    return unwrap<Stocktake>((await apiClient.post(`/stocks/opnames/${id}/complete`, { counts })).data);
  },
};
