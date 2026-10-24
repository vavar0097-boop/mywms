export interface CreateInitialStockDto {
  item_id: string;

  location_id: string;

  quantity: number;

  remarks?: string;
}