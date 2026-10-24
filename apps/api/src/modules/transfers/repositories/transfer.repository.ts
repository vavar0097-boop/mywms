import { db } from "../../../database/client";

import {
  CreateTransferDto,
} from "../dto/create-transfer.dto";

import {
  TransferStatus,
} from "../types/transfer.type";

export class TransferRepository {
  async findById(
    id: string
  ) {
    const { data } = await db
      .from("stock_transfers")
      .select(`
        *,
        stock_transfer_items(*),
        transfer_events(*)
      `)
      .eq("id", id)
      .single();

    return data;
  }

  async findMany(
    page: number,
    limit: number,
    search?: string,
    status?: TransferStatus
  ) {
    let query = db
      .from("stock_transfers")
      .select("*", {
        count: "exact",
      });

    if (search) {
      query = query.ilike(
        "transfer_no",
        `%${search}%`
      );
    }

    if (status) {
      query = query.eq(
        "status",
        status
      );
    }

    const from =
      (page - 1) * limit;

    const to =
      from + limit - 1;

    const {
      data,
      count,
      error,
    } = await query
      .order("created_at", {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      throw error;
    }

    return {
      data,
      total: count ?? 0,
    };
  }

  async generateTransferNo() {
    return `TRF-${Date.now()}`;
  }

  async createTransfer(
    dto: CreateTransferDto,
    transferNo: string,
    userId: string
  ) {
    const {
      data,
      error,
    } = await db
      .from("stock_transfers")
      .insert({
        transfer_no: transferNo,
        source_warehouse_id:
          dto.source_warehouse_id,
        destination_warehouse_id:
          dto.destination_warehouse_id,
        source_location_id:
          dto.source_location_id,
        destination_location_id:
          dto.destination_location_id,
        status: "DRAFT",
        remarks:
          dto.remarks ?? null,
        requested_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createTransferItems(
    transferId: string,
    items: CreateTransferDto["items"]
  ) {
    const payload =
      items.map((item) => ({
        transfer_id: transferId,
        item_id: item.item_id,
        qty_requested:
          item.qty_requested,
        qty_shipped: 0,
        qty_received: 0,
      }));

    const { error } = await db
      .from(
        "stock_transfer_items"
      )
      .insert(payload);

    if (error) {
      throw error;
    }
  }

  async getTransferItems(
    transferId: string
  ) {
    const {
      data,
      error,
    } = await db
      .from(
        "stock_transfer_items"
      )
      .select("*")
      .eq(
        "transfer_id",
        transferId
      );

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async updateStatus(
    transferId: string,
    status: TransferStatus,
    payload?: Record<
      string,
      unknown
    >
  ) {
    const {
      data,
      error,
    } = await db
      .from(
        "stock_transfers"
      )
      .update({
        status,
        ...payload,
      })
      .eq("id", transferId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateStatusIfCurrent(
    transferId: string,
    currentStatus: TransferStatus,
    nextStatus: TransferStatus,
    payload?: Record<
      string,
      unknown
    >
  ) {
    const {
      data,
      error,
    } = await db
      .from(
        "stock_transfers"
      )
      .update({
        status: nextStatus,
        ...payload,
      })
      .eq("id", transferId)
      .eq(
        "status",
        currentStatus
      )
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Transfer status already changed"
      );
    }

    return data;
  }

  async updateItemShippedQty(
    itemId: string,
    qty: number
  ) {
    const { error } = await db
      .from(
        "stock_transfer_items"
      )
      .update({
        qty_shipped: qty,
      })
      .eq("id", itemId);

    if (error) {
      throw error;
    }
  }

  async updateItemReceivedQty(
    itemId: string,
    qty: number
  ) {
    const { error } = await db
      .from(
        "stock_transfer_items"
      )
      .update({
        qty_received: qty,
      })
      .eq("id", itemId);

    if (error) {
      throw error;
    }
  }

  async createEvent(
    transferId: string,
    eventType:
      | "REQUESTED"
      | "PICKED"
      | "SHIPPED"
      | "RECEIVED"
      | "CANCELLED",
    userId: string,
    remarks?: string
  ) {
    const { error } = await db
      .from(
        "transfer_events"
      )
      .insert({
        transfer_id: transferId,
        event_type: eventType,
        event_by: userId,
        notes:
          remarks ?? null,
      });

    if (error) {
      throw error;
    }
  }

  async getEvents(
    transferId: string
  ) {
    const {
      data,
      error,
    } = await db
      .from(
        "transfer_events"
      )
      .select("*")
      .eq(
        "transfer_id",
        transferId
      )
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return data ?? [];
  }
}