import { z } from "zod";

export const stockQuerySchema =
  z.object({
    item_id:
      z.string()
        .uuid()
        .optional(),

    location_id:
      z.string()
        .uuid()
        .optional(),

    page:
      z.coerce.number()
        .int()
        .min(1)
        .default(1),

    limit:
      z.coerce.number()
        .int()
        .min(1)
        .max(100)
        .default(20),
  });

export const createInitialStockSchema =
  z.object({
    item_id:
      z.string().uuid(),

    location_id:
      z.string().uuid(),

    quantity:
      z.number()
        .positive(),

    remarks:
      z.string()
        .max(1000)
        .optional(),
  });

export const createStockAdjustmentSchema =
  z.object({
    item_id:
      z.string().uuid(),

    location_id:
      z.string().uuid(),

    quantity:
      z.number()
        .positive(),

    stock_effect:
      z.enum([
        "PLUS",
        "MINUS",
      ]),

    remarks:
      z.string()
        .max(1000)
        .optional(),
  });