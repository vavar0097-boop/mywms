import { z } from "zod";

import {
  openCashierSessionSchema,
  closeCashierSessionSchema,
  createCashierDepositSchema,
  createCashierExpenseSchema,
} from "../validators/cashier-session.validator";

export type OpenCashierSessionDto =
  z.infer<
    typeof openCashierSessionSchema
  >;

export type CloseCashierSessionDto =
  z.infer<
    typeof closeCashierSessionSchema
  >;

export type CreateCashierExpenseDto =
  z.infer<
    typeof createCashierExpenseSchema
  >;

export type CreateCashierDepositDto =
  z.infer<
    typeof createCashierDepositSchema
  >;
