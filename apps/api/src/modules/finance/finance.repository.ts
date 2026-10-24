import { supabase } from "../../config/supabase";

export type FinanceTransactionPayload = {
  transaction_date: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description?: string | null;
  amount: number;
  payment_method?: string | null;
};

export type DailyPurchaseItemPayload = {
  item_name: string;
  qty: number;
  unit?: string | null;
  unit_price: number;
  subtotal: number;
  category: string;
  ai_original_value?: Record<string, unknown> | null;
  is_edited?: boolean;
};

export type DailyPurchasePayload = {
  purchase_date: string;
  outlet_id?: string | null;
  vendor_name?: string | null;
  receipt_photo_url?: string | null;
  ai_raw_text?: string | null;
  ai_json_result?: Record<string, unknown> | null;
  ai_provider?: string | null;
  status?: "DRAFT_AI" | "NEEDS_REVIEW";
  total_amount: number;
  reviewed_by?: string | null;
  items: DailyPurchaseItemPayload[];
};

export class FinanceRepository {
  async findAll(params?: {
    search?: string;
    type?: string;
    limit?: number;
  }) {
    const search = params?.search?.trim();
    const limit = params?.limit ?? 100;

    let query = supabase
      .from("finance_transactions")
      .select("*")
      .order("transaction_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (params?.type) {
      query = query.eq("type", params.type);
    }

    if (search) {
      query = query.or(
        `category.ilike.%${search}%,description.ilike.%${search}%,payment_method.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return data ?? [];
  }

  async create(payload: FinanceTransactionPayload) {
    const { data, error } = await supabase
      .from("finance_transactions")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async update(
    id: string,
    payload: Partial<FinanceTransactionPayload>,
  ) {
    const { data, error } = await supabase
      .from("finance_transactions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async delete(id: string) {
    const { error } = await supabase
      .from("finance_transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async findCashierSettlements(params?: {
    status?: string;
    limit?: number;
  }) {
    const limit = params?.limit ?? 100;

    let query = supabase
      .from("v_cashier_session_summary")
      .select("*")
      .order("opened_at", {
        ascending: false,
      })
      .limit(limit);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data ?? [];
  }

  async findPosSales(params?: {
    status?: string;
    limit?: number;
  }) {
    const limit = params?.limit ?? 100;

    let query = supabase
      .from("sales")
      .select(`
        *,
        sale_payments (*),
        sale_items (*),
        cashier:cashier_id (
          username,
          full_name
        ),
        location:location_id (
          code,
          name
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data ?? [];
  }

  async findDailyPurchases(params?: {
    status?: string;
    limit?: number;
  }) {
    const limit = params?.limit ?? 100;

    let query = supabase
      .from("daily_purchase_batches")
      .select(`
        *,
        outlet:outlet_id (
          code,
          name
        ),
        daily_purchase_items (*)
      `)
      .order("purchase_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data ?? [];
  }

  async createDailyPurchase(payload: DailyPurchasePayload) {
    const { items, ...batchPayload } = payload;

    const { data: batch, error: batchError } = await supabase
      .from("daily_purchase_batches")
      .insert(batchPayload)
      .select()
      .single();

    if (batchError) throw batchError;

    const { error: itemsError } = await supabase
      .from("daily_purchase_items")
      .insert(
        items.map((item) => ({
          ...item,
          batch_id: batch.id,
        })),
      );

    if (itemsError) throw itemsError;

    return this.findDailyPurchaseById(batch.id);
  }

  async updateDailyPurchase(
    id: string,
    payload: DailyPurchasePayload,
  ) {
    const { items, ...batchPayload } = payload;

    const { error: batchError } = await supabase
      .from("daily_purchase_batches")
      .update(batchPayload)
      .eq("id", id)
      .in("status", ["DRAFT_AI", "NEEDS_REVIEW"]);

    if (batchError) throw batchError;

    const { error: deleteError } = await supabase
      .from("daily_purchase_items")
      .delete()
      .eq("batch_id", id);

    if (deleteError) throw deleteError;

    const { error: itemsError } = await supabase
      .from("daily_purchase_items")
      .insert(
        items.map((item) => ({
          ...item,
          batch_id: id,
        })),
      );

    if (itemsError) throw itemsError;

    return this.findDailyPurchaseById(id);
  }

  async findDailyPurchaseById(id: string) {
    const { data, error } = await supabase
      .from("daily_purchase_batches")
      .select(`
        *,
        outlet:outlet_id (
          code,
          name
        ),
        daily_purchase_items (*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async approveDailyPurchase(params: {
    id: string;
    approvedBy: string;
    financeTransactionId: string;
  }) {
    const { data, error } = await supabase
      .from("daily_purchase_batches")
      .update({
        status: "APPROVED",
        approved_by: params.approvedBy,
        approved_at: new Date().toISOString(),
        finance_transaction_id: params.financeTransactionId,
      })
      .eq("id", params.id)
      .in("status", ["DRAFT_AI", "NEEDS_REVIEW"])
      .select()
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async findReportTransactions(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("*")
      .gte("transaction_date", params.dateFrom)
      .lte("transaction_date", params.dateTo)
      .order("transaction_date", {
        ascending: true,
      });

    if (error) throw error;

    return data ?? [];
  }

  async findReportSales(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_payments (*),
        location:location_id (
          code,
          name
        )
      `)
      .gte("created_at", `${params.dateFrom}T00:00:00`)
      .lte("created_at", `${params.dateTo}T23:59:59`)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return data ?? [];
  }

  async findReportDailyPurchases(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await supabase
      .from("daily_purchase_batches")
      .select(`
        *,
        daily_purchase_items (*),
        outlet:outlet_id (
          code,
          name
        )
      `)
      .gte("purchase_date", params.dateFrom)
      .lte("purchase_date", params.dateTo)
      .order("purchase_date", {
        ascending: true,
      });

    if (error) throw error;

    return data ?? [];
  }
}
