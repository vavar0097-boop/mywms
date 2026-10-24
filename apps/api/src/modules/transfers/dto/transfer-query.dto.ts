import type { TransferStatus } from "../types/transfer.type";

export interface TransferQueryDto {
  page?: number;
  limit?: number;

  search?: string;

  status?: TransferStatus;
}