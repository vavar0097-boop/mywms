import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  item_id: z.string().uuid("Item is required"),
  qty_ordered: z.coerce
    .number()
    .positive("Quantity must be greater than 0"),
  unit_price: z.coerce
    .number()
    .min(0, "Unit price cannot be negative")
    .default(0),
  notes: z.string().max(500).optional().nullable(),
});

export const createPurchaseOrderSchema = z.object({
  vendor_name: z.string().trim().min(1, "Vendor is required").max(150),
  vendor_id: z.string().uuid().optional().nullable(),
  order_date: z.string().trim().min(1, "Order date is required"),
  expected_date: z.string().trim().optional().nullable(),
  destination_location_id: z.string().uuid("Destination location is required"),
  notes: z.string().max(1000).optional().nullable(),
  source_type: z
    .enum(["MANUAL", "SPREADSHEET", "AI_PHOTO", "AUTO_LOW_STOCK"])
    .default("MANUAL"),
  source_payload: z.record(z.string(), z.unknown()).optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one PO item is required"),
});

export const purchaseOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  status: z
    .enum(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"])
    .optional(),
});

export const purchaseOrderActionSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

export const receivePurchaseOrderSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        purchase_order_item_id: z.string().uuid("PO item is required"),
        qty_received: z.coerce
          .number()
          .positive("Received quantity must be greater than 0"),
      }),
    )
    .min(1, "At least one received item is required"),
});

export const parsePurchaseOrderImportSchema = z.object({
  raw_text: z.string().min(1, "Spreadsheet text is required"),
});

export const lowStockQuerySchema = z.object({
  location_id: z.string().uuid("Location is required"),
});

export const generateLowStockPurchaseOrderSchema = z.object({
  destination_location_id: z.string().uuid("Destination location is required"),
  vendor_id: z.string().uuid().optional().nullable(),
  vendor_name: z.string().trim().max(150).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
