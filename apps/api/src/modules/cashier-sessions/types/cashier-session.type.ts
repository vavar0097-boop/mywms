export type CashierSessionStatus =
  | "OPEN"
  | "CLOSED"
  | "CANCELLED";

export type CashierSessionSummary = {
  cashier_session_id: string;
  session_no: string;
  cashier_id: string;
  location_id: string;
  shift_name: string;
  status: CashierSessionStatus;
  opened_at: string;
  closed_at: string | null;

  opening_cash: number;

  total_sales_count: number;
  total_sales: number;
  cash_sales: number;
  noncash_sales: number;

  total_expenses: number;
  total_deposits: number;

  calculated_expected_cash: number;
  closed_expected_cash: number;
  actual_cash: number | null;
  cash_difference: number | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
};