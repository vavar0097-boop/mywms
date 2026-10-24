import { db } from "../../../database/client";

import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from "../dto/purchase-order.dto";
import { PurchaseOrderStatus } from "../types/purchase-order.type";
import { BadRequestError } from "../../../utils/errors";

export class PurchaseOrderRepository {
  async findLowStockCandidates(locationId: string) {
    const { data, error } = await db.rpc(
      "get_low_stock_reorder_candidates",
      {
        p_location_id: locationId,
      },
    );

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async findItemsForImport() {
    const { data, error } = await db
      .from("items")
      .select(`
        id,
        item_code,
        item_name,
        units (
          code,
          name
        )
      `)
      .eq("is_deleted", false)
      .eq("is_active", true)
      .limit(1000);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: PurchaseOrderStatus;
  }) {
    let query = db
      .from("purchase_orders")
      .select(
        `
        *,
        destination:destination_location_id (
          id,
          code,
          name,
          level
        ),
        vendors (
          id,
          vendor_code,
          vendor_name,
          phone,
          email
        ),
        purchase_order_items (
          id,
          item_id,
          qty_ordered,
          qty_received,
          unit_price,
          notes,
          items (
            id,
            item_code,
            item_name
          )
        )
      `,
        {
          count: "exact",
        },
      );

    if (params.search?.trim()) {
      const search = params.search.trim();
      query = query.or(
        `po_no.ilike.%${search}%,vendor_name.ilike.%${search}%`,
      );
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;

    const { data, count, error } = await query
      .order("created_at", {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      throw error;
    }

    return {
      data: data ?? [],
      total: count ?? 0,
    };
  }

  async findById(id: string) {
    const { data, error } = await db
      .from("purchase_orders")
      .select(`
        *,
        destination:destination_location_id (
          id,
          code,
          name,
          level
        ),
        vendors (
          id,
          vendor_code,
          vendor_name,
          phone,
          email
        ),
        purchase_order_items (
          id,
          item_id,
          qty_ordered,
          qty_received,
          unit_price,
          notes,
          items (
            id,
            item_code,
            item_name
          )
        ),
        purchase_receipts (
          id,
          receipt_no,
          received_at,
          notes,
          purchase_receipt_items (
            id,
            item_id,
            qty_received,
            purchase_order_item_id
          )
        ),
        purchase_order_events (*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async create(dto: CreatePurchaseOrderDto, userId: string) {
    const { items, ...payload } = dto;
    const { data, error } = await db
      .from("purchase_orders")
      .insert({
        ...payload,
        expected_date: payload.expected_date || null,
        notes: payload.notes || null,
        source_payload: payload.source_payload ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await this.replaceItems(data.id, items);
    await this.createEvent(data.id, "CREATED", userId, payload.notes);

    return data;
  }

  async replaceItems(
    purchaseOrderId: string,
    items: CreatePurchaseOrderDto["items"],
  ) {
    const { error: deleteError } = await db
      .from("purchase_order_items")
      .delete()
      .eq("purchase_order_id", purchaseOrderId);

    if (deleteError) {
      throw deleteError;
    }

    const { error } = await db.from("purchase_order_items").insert(
      items.map((item) => ({
        purchase_order_id: purchaseOrderId,
        item_id: item.item_id,
        qty_ordered: item.qty_ordered,
        unit_price: item.unit_price,
        notes: item.notes ?? null,
      })),
    );

    if (error) {
      throw error;
    }
  }

  async updateStatus(params: {
    id: string;
    status: PurchaseOrderStatus;
    payload?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("purchase_orders")
      .update({
        status: params.status,
        ...params.payload,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createReceipt(params: {
    purchaseOrderId: string;
    userId: string;
    dto: ReceivePurchaseOrderDto;
  }) {
    const { data, error } = await db
      .from("purchase_receipts")
      .insert({
        purchase_order_id: params.purchaseOrderId,
        received_by: params.userId,
        notes: params.dto.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createReceiptItems(params: {
    receiptId: string;
    items: Array<{
      purchase_order_item_id: string;
      item_id: string;
      qty_received: number;
    }>;
  }) {
    const { error } = await db.from("purchase_receipt_items").insert(
      params.items.map((item) => ({
        purchase_receipt_id: params.receiptId,
        ...item,
      })),
    );

    if (error) {
      throw error;
    }
  }

  async incrementReceivedQty(params: {
    purchaseOrderItemId: string;
    qtyReceived: number;
  }) {
    // Uses a DB-side atomic increment (row-locked SELECT ... FOR
    // UPDATE + UPDATE inside a single function call) instead of a
    // JS-side read-then-write, so concurrent receive requests for
    // the same PO item can't lose an update or both slip past the
    // "exceeds remaining quantity" check against the same stale value.
    const { data, error } = await db.rpc(
      "increment_po_item_received_qty",
      {
        p_purchase_order_item_id: params.purchaseOrderItemId,
        p_qty_received: params.qtyReceived,
      },
    );

    if (error) {
      throw new BadRequestError(
        error.message || "Failed to record received quantity",
      );
    }

    return data;
  }

  async createEvent(
    purchaseOrderId: string,
    eventType: string,
    userId: string,
    notes?: string | null,
  ) {
    const { error } = await db.from("purchase_order_events").insert({
      purchase_order_id: purchaseOrderId,
      event_type: eventType,
      event_by: userId,
      notes: notes ?? null,
    });

    if (error) {
      throw error;
    }
  }
}
