import { z } from "zod";

import {
  ITEM_TYPES,
} from "../types/item.type";

const itemTypeEnum = z.enum(ITEM_TYPES);

export const createItemSchema = z.object({
  item_name: z
    .string()
    .trim()
    .min(3, "Item name minimum 3 characters")
    .max(100, "Item name maximum 100 characters"),

  item_type: itemTypeEnum,

  base_unit_id: z.uuid(),

  barcode: z
    .string()
    .trim()
    .max(100)
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  min_stock: z.coerce
    .number()
    .min(0, "Minimum stock cannot be negative")
    .optional(),

  reorder_qty: z.coerce
    .number()
    .min(0, "Reorder quantity cannot be negative")
    .optional(),

  default_vendor_name: z
    .string()
    .trim()
    .max(150)
    .optional()
    .nullable(),

  default_vendor_id: z.uuid().optional().nullable(),
});

export const updateItemSchema = z.object({
  item_name: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .optional(),

  item_type: itemTypeEnum.optional(),

  base_unit_id: z.uuid().optional(),

  barcode: z
    .string()
    .trim()
    .max(100)
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  min_stock: z.coerce.number().min(0).optional(),

  reorder_qty: z.coerce.number().min(0).optional(),

  default_vendor_name: z
    .string()
    .trim()
    .max(150)
    .optional()
    .nullable(),

  default_vendor_id: z.uuid().optional().nullable(),

  is_active: z.boolean().optional(),
});

export const itemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().optional(),
});
