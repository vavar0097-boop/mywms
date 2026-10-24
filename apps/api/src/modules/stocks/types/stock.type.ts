export type MovementType =
  | "IN"
  | "OUT"
  | "ADJ";

export type ReferenceType =
  | "INITIAL_STOCK"
  | "TRANSFER"
  | "ADJUSTMENT"
  | "MANUAL"
  | "SALE";

export type StockEffect =
  | "PLUS"
  | "MINUS";

export interface CurrentStock {
  item_id: string;
  location_id: string;
  quantity: number;
  updated_at: string;
}

export interface StockLedger {
  id: string;

  item_id: string;

  location_id: string;

  movement_type: MovementType;

  quantity: number;

  reference_type:
    | ReferenceType
    | null;

  reference_id: string | null;

  reference_no: string | null;

  remarks: string | null;

  created_by: string | null;

  created_at: string;
}
