import { z } from "zod";

export const createPosSaleSchema = z.object({
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid("Menu item is required"),
        quantity: z.coerce.number().positive("Quantity must be greater than 0"),
      }),
    )
    .min(1, "At least one item is required"),
  payment_method: z.enum(["CASH", "NONCASH"]),
  paid_amount: z.coerce.number().positive("Paid amount must be greater than 0"),
  reference_no: z.string().max(100).optional().nullable(),
});

export const voidPosSaleSchema = z.object({
  reason: z
    .string()
    .min(1, "Void reason is required")
    .max(500, "Void reason is too long"),
});
