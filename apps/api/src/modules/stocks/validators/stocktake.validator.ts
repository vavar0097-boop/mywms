import { z } from "zod";

export const createStocktakeSchema = z.object({
  location_id: z.string().uuid(),
});

export const completeStocktakeSchema = z.object({
  counts: z.array(z.object({
    item_id: z.string().uuid(),
    counted_quantity: z.coerce.number().min(0),
  })).max(10000),
});
