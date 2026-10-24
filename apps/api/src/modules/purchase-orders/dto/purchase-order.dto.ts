import { z } from "zod";

import {
  createPurchaseOrderSchema,
  generateLowStockPurchaseOrderSchema,
  lowStockQuerySchema,
  parsePurchaseOrderImportSchema,
  purchaseOrderActionSchema,
  purchaseOrderQuerySchema,
  receivePurchaseOrderSchema,
} from "../validators/purchase-order.validator";

export type CreatePurchaseOrderDto = z.infer<
  typeof createPurchaseOrderSchema
>;

export type PurchaseOrderQueryDto = z.infer<
  typeof purchaseOrderQuerySchema
>;

export type PurchaseOrderActionDto = z.infer<
  typeof purchaseOrderActionSchema
>;

export type ReceivePurchaseOrderDto = z.infer<
  typeof receivePurchaseOrderSchema
>;

export type ParsePurchaseOrderImportDto = z.infer<
  typeof parsePurchaseOrderImportSchema
>;

export type LowStockQueryDto = z.infer<
  typeof lowStockQuerySchema
>;

export type GenerateLowStockPurchaseOrderDto = z.infer<
  typeof generateLowStockPurchaseOrderSchema
>;
