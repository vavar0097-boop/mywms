import { ItemType }
from "../types/item.type";

export interface CreateItemDto {
  item_name: string;
  item_type: ItemType;
  base_unit_id: string;
  barcode?: string;
  description?: string;
  min_stock?: number;
  reorder_qty?: number;
  default_vendor_name?: string | null;
  default_vendor_id?: string | null;
}
