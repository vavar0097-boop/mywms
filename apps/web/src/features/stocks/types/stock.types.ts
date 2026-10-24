export type StockItem = {
  id: string;
  item_code: string;
  item_name: string;
  item_type?: string | null;
  unit_code?: string | null;
  unit_name?: string | null;
  unit?: {
    code?: string | null;
    name?: string | null;
  } | null;
};

export type StockLocation = {
  id: string;
  code: string;
  name: string;
};

export type CurrentStock = {
  id?: string;
  item_id: string;
  location_id: string;
  quantity: number;
  created_at?: string | null;
  updated_at?: string | null;
  items?: StockItem | null;
  locations?: StockLocation | null;
};

export type StockLedger = {
  id: string;
  item_id: string;
  location_id: string;
  movement_type: "IN" | "OUT" | "ADJ" | string;
  quantity: number;
  stock_effect?: "PLUS" | "MINUS" | string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  reference_no?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  items?: StockItem | null;
  locations?: StockLocation | null;
};

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

export type StockQuery = {
  page?: number;
  limit?: number;
  item_id?: string;
  location_id?: string;
};

export type CreateInitialStockPayload = {
  item_id: string;
  location_id: string;
  quantity: number;
  remarks?: string;
};

export type CreateAdjustmentPayload = {
  item_id: string;
  location_id: string;
  quantity: number;
  stock_effect: "PLUS" | "MINUS";
  remarks?: string;
};
