export interface CreateTransferItemDto {
  item_id: string;

  qty_requested: number;
}

export interface CreateTransferDto {
  source_warehouse_id: string;

  destination_warehouse_id: string;

  source_location_id: string;

  destination_location_id: string;

  remarks?: string;

  items: CreateTransferItemDto[];
}

export interface TransferActionDto {
  remarks?: string;
}