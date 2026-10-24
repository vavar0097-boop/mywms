export type TransferStatus =
  | "DRAFT"
  | "REQUESTED"
  | "PICKED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "CANCELLED";

export type TransferAction =
  | "request"
  | "pick"
  | "dispatch"
  | "receive"
  | "cancel";

export type WarehouseOption = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
};

export type LocationOption = {
  id: string;
  code: string;
  name: string;
  level: string | null;
  warehouse_id: string | null;
  parent_id: string | null;
  is_active: boolean;
};

export type ItemOption = {
  id: string;
  item_code: string;
  item_name: string;
  unit_name: string | null;
  unit_code: string | null;
  is_active: boolean;
};

export type TransferItem = {
  id?: string;
  item_id: string;
  item_code?: string | null;
  item_name?: string | null;
  name?: string | null;
  qty_requested?: number | null;
  quantity_requested?: number | null;
  qty_picked?: number | null;
  qty_received?: number | null;
  unit_name?: string | null;
  unit_code?: string | null;
};

export type TransferEvent = {
  id?: string;
  transfer_id?: string;
  status?: TransferStatus | string | null;
  event_type?: string | null;
  notes?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
};

export type Transfer = {
  id: string;
  transfer_no?: string | null;

  source_warehouse_id?: string | null;
  source_warehouse_code?: string | null;
  source_warehouse_name?: string | null;

  destination_warehouse_id?: string | null;
  destination_warehouse_code?: string | null;
  destination_warehouse_name?: string | null;

  source_location_id?: string | null;
  source_location_code?: string | null;
  source_location_name?: string | null;

  destination_location_id?: string | null;
  destination_location_code?: string | null;
  destination_location_name?: string | null;

  status: TransferStatus;
  remarks?: string | null;

  requested_by?: string | null;
  approved_by?: string | null;
  received_by?: string | null;

  requested_at?: string | null;
  approved_at?: string | null;
  shipped_at?: string | null;
  received_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  items?: TransferItem[];
  transfer_items?: TransferItem[];
  events?: TransferEvent[];
  transfer_events?: TransferEvent[];
};

export type CreateTransferItemPayload = {
  item_id: string;
  qty_requested: number;
};

export type CreateTransferPayload = {
  source_warehouse_id: string;
  destination_warehouse_id: string;
  source_location_id: string;
  destination_location_id: string;
  remarks?: string;
  items: CreateTransferItemPayload[];
};
