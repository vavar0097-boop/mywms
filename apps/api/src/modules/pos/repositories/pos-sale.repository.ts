import { db } from "../../../database/client";
import { BadRequestError, NotFoundError } from "../../../utils/errors";

import { PosMenuItemRow } from "../types/pos-sale.type";

type CreateSaleParams = {
  cashierSessionId: string;
  cashierId: string;
  locationId: string;
  subtotal: number;
  grandTotal: number;
};

type CreateSaleItemParams = {
  saleId: string;
  itemId: string;
  itemCodeSnapshot: string;
  itemNameSnapshot: string;
  unitNameSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type CreatePaymentParams = {
  saleId: string;
  paymentMethod: "CASH" | "NONCASH";
  amount: number;
  referenceNo?: string | null;
};

export class PosSaleRepository {
  async findOutletLocations() {
    const { data, error } = await db
      .from("locations")
      .select(`
        id,
        location_code:code,
        location_name:name,
        location_type:level,
        warehouse_id,
        parent_id,
        is_active,
        created_at
      `)
      .eq("level", "OUTLET")
      .eq("is_active", true)
      .order("code", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async findMenuItems(params?: {
    search?: string;
    limit?: number;
    availableOnly?: boolean;
  }) {
    const search = params?.search?.trim();
    const limit = params?.limit ?? 200;

    let query = db
      .from("pos_menu_items")
      .select(`
        *,
        items (
          id,
          item_code,
          item_name,
          units:base_unit_id (
            code,
            name
          )
        ),
        bom_components:pos_menu_item_bom_components (
          id,
          component_item_id,
          quantity_per_menu,
          tolerance_percent,
          is_fixed_quantity,
          component_item:component_item_id (
            id,
            item_code,
            item_name,
            units:base_unit_id (
              code,
              name
            )
          )
        )
      `)
      .eq("is_visible", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("menu_name", {
        ascending: true,
      })
      .limit(limit);

    if (params?.availableOnly ?? true) {
      query = query.eq("is_available", true);
    }

    if (search) {
      query = query.or(
        `menu_code.ilike.%${search}%,menu_name.ilike.%${search}%,category.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as PosMenuItemRow[];
  }

  async findMenuItemsByIds(ids: string[]) {
    const { data, error } = await db
      .from("pos_menu_items")
      .select(`
        *,
        items (
          id,
          item_code,
          item_name,
          units:base_unit_id (
            code,
            name
          )
        ),
        bom_components:pos_menu_item_bom_components (
          id,
          component_item_id,
          quantity_per_menu,
          tolerance_percent,
          is_fixed_quantity,
          component_item:component_item_id (
            id,
            item_code,
            item_name,
            units:base_unit_id (
              code,
              name
            )
          )
        )
      `)
      .in("id", ids)
      .eq("is_visible", true)
      .eq("is_available", true);

    if (error) {
      throw error;
    }

    return (data ?? []) as PosMenuItemRow[];
  }

  async createSale(params: CreateSaleParams) {
    const { data, error } = await db
      .from("sales")
      .insert({
        cashier_session_id: params.cashierSessionId,
        cashier_id: params.cashierId,
        location_id: params.locationId,
        subtotal: params.subtotal,
        discount_total: 0,
        tax_total: 0,
        grand_total: params.grandTotal,
        status: "PAID",
        payment_status: "PAID",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createSaleItems(items: CreateSaleItemParams[]) {
    const { error } = await db
      .from("sale_items")
      .insert(
        items.map((item) => ({
          sale_id: item.saleId,
          item_id: item.itemId,
          item_code_snapshot: item.itemCodeSnapshot,
          item_name_snapshot: item.itemNameSnapshot,
          unit_name_snapshot: item.unitNameSnapshot,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
        })),
      );

    if (error) {
      throw error;
    }
  }

  async createPayment(params: CreatePaymentParams) {
    const { data, error } = await db
      .from("sale_payments")
      .insert({
        sale_id: params.saleId,
        payment_method: params.paymentMethod,
        amount: params.amount,
        reference_no: params.referenceNo ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createFinanceTransaction(params: {
    saleId: string;
    amount: number;
    paymentMethod: string;
    cashierId: string;
  }) {
    const { error } = await db
      .from("finance_transactions")
      .insert({
        type: "INCOME",
        category: "POS Sales",
        description: "POS sale payment",
        amount: params.amount,
        payment_method: params.paymentMethod,
        reference_type: "SALE",
        reference_id: params.saleId,
        created_by: params.cashierId,
      });

    if (error) {
      throw error;
    }
  }

  async findSaleById(saleId: string) {
    const { data, error } = await db
      .from("sales")
      .select(`
        *,
        sale_items (*),
        sale_payments (*)
      `)
      .eq("id", saleId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findSaleStockMovements(saleId: string) {
    const { data, error } = await db
      .from("stock_ledgers")
      .select("*")
      .eq("reference_type", "SALE")
      .eq("reference_id", saleId)
      .eq("movement_type", "OUT");

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async voidSale(params: {
    saleId: string;
    reason: string;
  }) {
    const { data, error } = await db
      .from("sales")
      .update({
        status: "VOIDED",
        payment_status: "REFUNDED",
        voided_at: new Date().toISOString(),
        void_reason: params.reason,
      })
      .eq("id", params.saleId)
      .eq("status", "PAID")
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new BadRequestError("Sale cannot be voided");
    }

    return data;
  }

  async createVoidFinanceTransaction(params: {
    saleId: string;
    amount: number;
    cashierId: string;
    reason: string;
  }) {
    const { error } = await db
      .from("finance_transactions")
      .insert({
        type: "EXPENSE",
        category: "POS Void",
        description: params.reason,
        amount: params.amount,
        payment_method: "REFUND",
        reference_type: "SALE_VOID",
        reference_id: params.saleId,
        created_by: params.cashierId,
      });

    if (error) {
      throw error;
    }
  }

  assertSaleFound(sale: unknown) {
    if (!sale) {
      throw new NotFoundError("Sale not found");
    }
  }
}
