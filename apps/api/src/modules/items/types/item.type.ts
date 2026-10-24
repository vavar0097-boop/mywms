export const ITEM_TYPES = [
  "RAW_MATERIAL",
  "FINISHED_GOOD",
  "SUPPLY",
  "ASSET",
] as const;

export type ItemType =
  (typeof ITEM_TYPES)[number];

export const ITEM_PREFIX_MAP: Record<
  ItemType,
  string
> = {
  RAW_MATERIAL: "RAW",
  FINISHED_GOOD: "FIN",
  SUPPLY: "SUP",
  ASSET: "AST",
};

export interface Item {
  id: string;

  item_code: string;

  item_code_prefix: string;

  barcode: string | null;

  item_name: string;

  item_type: ItemType;

  base_unit_id: string;

  description: string | null;

  min_stock: number;

  reorder_qty: number;

  default_vendor_name: string | null;

  default_vendor_id: string | null;

  is_active: boolean;

  is_deleted: boolean;

  deleted_at: string | null;

  created_at: string;

  updated_at: string;
}
