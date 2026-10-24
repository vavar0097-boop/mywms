import { z } from "zod";

import {
  createPosSaleSchema,
  voidPosSaleSchema,
} from "../validators/pos-sale.validator";

export type CreatePosSaleDto = z.infer<typeof createPosSaleSchema>;
export type VoidPosSaleDto = z.infer<typeof voidPosSaleSchema>;
