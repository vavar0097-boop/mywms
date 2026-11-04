import { z } from "zod";

export const createTransferSchema = z.object({
  source_warehouse_id: z
    .string()
    .uuid("Source warehouse is invalid"),

  destination_warehouse_id: z
    .string()
    .uuid("Destination warehouse is invalid"),

  source_location_id: z
    .string()
    .uuid("Source location is invalid"),

  destination_location_id: z
    .string()
    .uuid("Destination location is invalid"),

  remarks: z
    .string()
    .trim()
    .max(500)
    .optional(),

  items: z
    .array(
      z.object({
        item_id: z
          .string()
          .uuid("Item is invalid"),

        qty_requested: z
          .number()
          .positive(
            "Quantity must be greater than zero"
          ),
      })
    )
    .min(1, "At least one item is required"),
})
.refine(
  (data) =>
    data.source_location_id !==
    data.destination_location_id,
  {
    message:
      "Source and destination location cannot be the same",
    path: ["destination_location_id"],
  }
);

export const transferQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20),

  search: z
    .string()
    .trim()
    .optional(),

  status: z
    .enum([
      "DRAFT",
      "REQUESTED",
      "PICKED",
      "IN_TRANSIT",
      "RECEIVED",
      "CANCELLED",
    ])
    .optional(),
});

export const transferActionSchema = z.object({
  remarks: z
    .string()
    .trim()
    .max(500)
    .optional(),
});

export const transferReceiveSchema = z.object({
  remarks: z.string().trim().max(500).optional(),
  items: z.array(z.object({
    transfer_item_id: z.string().uuid("Transfer item is invalid"),
    qty_received: z.coerce.number().min(0, "Received quantity cannot be negative"),
  })).min(1, "A physical count is required for every transfer item"),
});

export type CreateTransferInput =
  z.infer<typeof createTransferSchema>;

export type TransferQueryInput =
  z.infer<typeof transferQuerySchema>;

export type TransferActionInput =
  z.infer<typeof transferActionSchema>;

export type TransferReceiveInput =
  z.infer<typeof transferReceiveSchema>;