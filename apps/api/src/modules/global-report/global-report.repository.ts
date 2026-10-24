import { db } from "../../database/client";

export class GlobalReportRepository {
  async getFinanceTransactions(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await db
      .from("finance_transactions")
      .select("*")
      .gte("transaction_date", params.dateFrom)
      .lte("transaction_date", params.dateTo)
      .order("transaction_date", {
        ascending: true,
      })
      .limit(5000);

    if (error) throw error;

    return data ?? [];
  }

  async getSales(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await db
      .from("sales")
      .select(`
        *,
        location:location_id (
          code,
          name
        ),
        cashier:cashier_id (
          username,
          full_name
        ),
        sale_items (*),
        sale_payments (*)
      `)
      .gte("created_at", `${params.dateFrom}T00:00:00`)
      .lte("created_at", `${params.dateTo}T23:59:59`)
      .order("created_at", {
        ascending: true,
      })
      .limit(5000);

    if (error) throw error;

    return data ?? [];
  }

  async getDailyPurchases(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await db
      .from("daily_purchase_batches")
      .select(`
        *,
        outlet:outlet_id (
          code,
          name
        ),
        daily_purchase_items (*)
      `)
      .gte("purchase_date", params.dateFrom)
      .lte("purchase_date", params.dateTo)
      .order("purchase_date", {
        ascending: true,
      })
      .limit(5000);

    if (error) throw error;

    return data ?? [];
  }

  async getCashierSettlements(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await db
      .from("v_cashier_session_summary")
      .select("*")
      .gte("opened_at", `${params.dateFrom}T00:00:00`)
      .lte("opened_at", `${params.dateTo}T23:59:59`)
      .order("opened_at", {
        ascending: true,
      })
      .limit(5000);

    if (error) throw error;

    return data ?? [];
  }

  async getCurrentStocks() {
    const { data, error } = await db
      .from("current_stocks")
      .select(`
        *,
        items (
          id,
          item_code,
          item_name,
          item_type,
          min_stock,
          reorder_qty,
          default_vendor_name,
          units:base_unit_id (
            code,
            name
          )
        ),
        locations (
          id,
          code,
          name,
          level,
          warehouses:warehouse_id (
            code,
            name
          )
        )
      `)
      .limit(5000);

    if (error) throw error;

    return data ?? [];
  }

  async getStockLedgers(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await db
      .from("stock_ledgers")
      .select(`
        *,
        items (
          item_code,
          item_name
        ),
        locations (
          code,
          name
        )
      `)
      .gte("created_at", `${params.dateFrom}T00:00:00`)
      .lte("created_at", `${params.dateTo}T23:59:59`)
      .order("created_at", {
        ascending: true,
      })
      .limit(5000);

    if (error) throw error;

    return data ?? [];
  }

  async getPurchaseOrders(params: {
    dateFrom: string;
    dateTo: string;
  }) {
    const { data, error } = await db
      .from("purchase_orders")
      .select(`
        *,
        destination:destination_location_id (
          code,
          name,
          level
        ),
        vendors (
          vendor_code,
          vendor_name,
          phone,
          email
        ),
        purchase_order_items (
          *,
          items (
            item_code,
            item_name
          )
        )
      `)
      .gte("order_date", params.dateFrom)
      .lte("order_date", params.dateTo)
      .order("order_date", {
        ascending: true,
      })
      .limit(5000);

    if (error) throw error;

    return data ?? [];
  }
}
