export type TransferStatus =
  | "DRAFT"
  | "REQUESTED"
  | "PICKED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "CANCELLED";

export interface TransferItem {
  id: string;
  transfer_id: string;
  item_id: string;

  qty_requested: number;
  qty_shipped: number;
  qty_received: number;

  created_at?: string;
}

export interface Transfer {
  id: string;

  transfer_no: string;

  source_warehouse_id: string;
  destination_warehouse_id: string;

  source_location_id: string;
  destination_location_id: string;

  status: TransferStatus;

  remarks?: string | null;

  requested_by?: string | null;
  approved_by?: string | null;
  received_by?: string | null;

  requested_at?: string | null;
  approved_at?: string | null;
  shipped_at?: string | null;
  received_at?: string | null;

  created_at: string;
  updated_at: string;

  items?: TransferItem[];
}

export interface TransferEvent {
  id: string;

  transfer_id: string;

  event_type:
    | "REQUESTED"
    | "PICKED"
    | "SHIPPED"
    | "RECEIVED"
    | "CANCELLED";

  remarks?: string | null;

  event_by?: string | null;

  created_at: string;
}

export interface TransferListQuery {
  page: number;
  limit: number;

  search?: string;

  status?: TransferStatus;
}