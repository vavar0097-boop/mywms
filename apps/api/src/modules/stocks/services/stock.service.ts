import {
  AuthRequest,
} from "../../../middleware/auth.middleware";

import {
  CreateInitialStockDto,
} from "../dto/create-initial-stock.dto";

import {
  CreateStockAdjustmentDto,
} from "../dto/create-stock-adjustment.dto";

import {
  StockQueryDto,
} from "../dto/stock-query.dto";

import {
  StockRepository,
} from "../repositories/stock.repository";

export class StockService {
  private repository =
    new StockRepository();

  async getCurrentStocks(
    query: StockQueryDto
  ) {
    const page =
      query.page ?? 1;

    const limit =
      query.limit ?? 20;

    const result =
      await this.repository
        .getCurrentStocks(
          page,
          limit,
          query.item_id,
          query.location_id
        );

    return {
      data: result.data,

      pagination: {
        page,
        limit,

        total:
          result.total,

        totalPages:
          Math.ceil(
            result.total /
            limit
          ),
      },
    };
  }

  async getLedgers(
    query: StockQueryDto
  ) {
    const page =
      query.page ?? 1;

    const limit =
      query.limit ?? 20;

    const result =
      await this.repository
        .getLedgers(
          page,
          limit,
          query.item_id,
          query.location_id
        );

    return {
      data: result.data,

      pagination: {
        page,
        limit,

        total:
          result.total,

        totalPages:
          Math.ceil(
            result.total /
            limit
          ),
      },
    };
  }

  async createInitialStock(
    dto: CreateInitialStockDto,
    user: AuthRequest["user"]
  ) {
    return this.repository
      .createStockMovement({
        item_id:
          dto.item_id,

        location_id:
          dto.location_id,

        movement_type:
          "IN",

        quantity:
          dto.quantity,

        reference_type:
          "INITIAL_STOCK",

        reference_id:
          null,

        reference_no:
          null,

        remarks:
          dto.remarks ?? null,

        created_by:
          user!.id,
      });
  }

  async createAdjustment(
    dto: CreateStockAdjustmentDto,
    user: AuthRequest["user"]
  ) {
    return this.repository
      .createStockMovement({
        item_id:
          dto.item_id,

        location_id:
          dto.location_id,

        movement_type:
          "ADJ",

        quantity:
          dto.quantity,

        reference_type:
          "ADJUSTMENT",

        reference_id:
          null,

        reference_no:
          null,

        remarks:
          dto.remarks ?? null,

        created_by:
          user!.id,

        stock_effect:
          dto.stock_effect,
      });
  }
}