export type PosMenuItemRow = {
  id: string;
  item_id: string | null;
  menu_code: string;
  menu_name: string;
  category: string | null;
  price: number | string;
  is_visible: boolean;
  is_available: boolean;
  sort_order: number;
  items?: {
    id: string;
    item_code: string;
    item_name: string;
    units?: {
      code?: string | null;
      name?: string | null;
    } | null;
  } | null;
  bom_components?: Array<{
    id: string;
    component_item_id: string;
    quantity_per_menu: number | string;
    tolerance_percent: number | string;
    is_fixed_quantity: boolean;
    component_item?: {
      id: string;
      item_code: string;
      item_name: string;
      units?: {
        code?: string | null;
        name?: string | null;
      } | null;
    } | null;
  }>;
  current_stock?: number | null;
  is_low_stock?: boolean;
};

export type PosSaleSummary = {
  sale_id: string;
  sale_no: string;
  cashier_session_id: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  payment_method: "CASH" | "NONCASH";
  paid_amount: number;
  change_amount: number;
};
