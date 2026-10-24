import {
  StockEffect,
} from "../types/stock.type";

export interface CreateStockAdjustmentDto {
  item_id: string;

  location_id: string;

  quantity: number;

  stock_effect: StockEffect;

  remarks?: string;
}