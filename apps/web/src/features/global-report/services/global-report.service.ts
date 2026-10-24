import { apiClient } from "@/shared/lib/api/client";

type UnknownRecord = Record<string, unknown>;

export type GlobalReport = {
  date_from: string;
  date_to: string;
  generated_at: string;
  summary: {
    sheet_count: number;
    source_sheet_count?: number;
    report_sheet_name?: string;
    sales_count: number;
    purchase_order_count: number;
    stock_rows: number;
    finance_transaction_count: number;
  };
  google: {
    synced: boolean;
    reason?: string;
    spreadsheet_id?: string;
    spreadsheet_url?: string;
    sheet_count?: number;
  };
  sheets?: Record<string, Array<Array<string | number>>>;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function unwrap(payload: unknown) {
  return isRecord(payload) && "data" in payload
    ? payload.data
    : payload;
}

export const globalReportService = {
  async generate(payload: {
    date_from: string;
    date_to: string;
    sync_google: boolean;
  }) {
    const response = await apiClient.post(
      "/global-report/generate",
      payload,
    );

    return unwrap(response.data) as GlobalReport;
  },
};
