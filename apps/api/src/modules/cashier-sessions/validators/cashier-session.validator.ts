import { z } from "zod";

export const cashierShiftOptions =
  ["Pagi", "Siang"] as const;

export const openCashierSessionSchema =
  z.object({
    location_id:
      z.string().uuid(
        "Location is required"
      ),

    shift_name:
      z.enum(cashierShiftOptions, {
        message: "Shift must be Pagi or Siang",
      }),

    opening_cash:
      z.coerce
        .number()
        .min(0, "Opening cash cannot be negative"),
  });

export const closeCashierSessionSchema =
  z.object({
    actual_cash:
      z.coerce
        .number()
        .min(0, "Actual cash cannot be negative"),

    notes:
      z.string()
        .max(500, "Notes is too long")
        .optional()
        .nullable(),
  });

export const createCashierExpenseSchema =
  z.object({
    expense_category:
      z.string()
        .min(1, "Expense category is required")
        .max(100, "Expense category is too long")
        .default("OPERATIONAL"),

    amount:
      z.coerce
        .number()
        .positive("Amount must be greater than 0"),

    reason:
      z.string()
        .min(1, "Reason is required")
        .max(500, "Reason is too long"),

    photo_url:
      z.string()
        .url("Photo URL is invalid")
        .optional()
        .nullable(),
  });

export const createCashierDepositSchema =
  z.object({
    amount:
      z.coerce
        .number()
        .positive("Amount must be greater than 0"),

    received_by:
      z.string()
        .min(1, "Receiver is required")
        .max(100, "Receiver is too long"),

    photo_url:
      z.string()
        .url("Photo URL is invalid")
        .optional()
        .nullable(),

    notes:
      z.string()
        .max(500, "Notes is too long")
        .optional()
        .nullable(),
  });
