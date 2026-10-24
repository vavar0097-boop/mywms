import { db } from "../../../database/client";
import {
  BadRequestError,
} from "../../../utils/errors";

export class StockRepository {
  async getCurrentStocks(
    page: number,
    limit: number,
    itemId?: string,
    locationId?: string
  ) {
    let query = db
      .from("current_stocks")
      .select(
        `
        *,
        items(
          id,
          item_code,
          item_name,
          item_type
        ),
        locations(
          id,
          code,
          name
        )
      `,
        {
          count: "exact",
        }
      );

    if (itemId) {
      query = query.eq(
        "item_id",
        itemId
      );
    }

    if (locationId) {
      query = query.eq(
        "location_id",
        locationId
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
    } = await query.range(
      from,
      to
    );

    if (error) {
      throw error;
    }

    return {
      data,
      total: count ?? 0,
    };
  }

  async getLedgers(
    page: number,
    limit: number,
    itemId?: string,
    locationId?: string
  ) {
    let query = db
      .from("stock_ledgers")
      .select(
        `
        *,
        items(
          id,
          item_code,
          item_name
        ),
        locations(
          id,
          code,
          name
        )
      `,
        {
          count: "exact",
        }
      );

    if (itemId) {
      query = query.eq(
        "item_id",
        itemId
      );
    }

    if (locationId) {
      query = query.eq(
        "location_id",
        locationId
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
    } = await query.range(
      from,
      to
    );

    if (error) {
      throw error;
    }

    return {
      data,
      total: count ?? 0,
    };
  }

  async createStockMovement(
    params: {
      item_id: string;
      location_id: string;
      movement_type:
        | "IN"
        | "OUT"
        | "ADJ";

      quantity: number;

      reference_type:
        | "INITIAL_STOCK"
        | "TRANSFER"
        | "ADJUSTMENT"
        | "MANUAL"
        | "SALE"
        | "PURCHASE_RECEIVE";

      reference_id: string | null;

      reference_no: string | null;

      remarks: string | null;

      created_by: string;

      stock_effect?:
        | "PLUS"
        | "MINUS";
    }
  ) {
    const {
      data,
      error,
    } = await db.rpc(
      "create_stock_movement",
      {
        p_item_id:
          params.item_id,

        p_location_id:
          params.location_id,

        p_movement_type:
          params.movement_type,

        p_quantity:
          params.quantity,

        p_reference_type:
          params.reference_type,

        p_reference_id:
          params.reference_id,

        p_reference_no:
          params.reference_no,

        p_remarks:
          params.remarks,

        p_created_by:
          params.created_by,

        p_stock_effect:
          params.stock_effect ??
          "PLUS",
      }
    );

    if (error) {
  throw new BadRequestError(
    error.message ||
  "Stock movement failed"
  );
}

    return data;
  }

  async getCurrentStock(
  itemId: string,
  locationId: string
) {
  const {
    data,
    error,
  } = await db
    .from("current_stocks")
    .select("quantity")
    .eq("item_id", itemId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.quantity ?? 0;
}
}
