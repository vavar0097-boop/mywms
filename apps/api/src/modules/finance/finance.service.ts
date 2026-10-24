import { BadRequestError } from "../../utils/errors";
import { syncGoogleSheet } from "../../services/google-sheets.service";
import {
  FinanceRepository,
  FinanceTransactionPayload,
  DailyPurchaseItemPayload,
  DailyPurchasePayload,
} from "./finance.repository";

const financeRepository = new FinanceRepository();

type ParsedPurchaseItem = {
  item_name: string;
  qty: number;
  unit?: string | null;
  unit_price: number;
  subtotal: number;
  category: string;
};

type ParsedPurchase = {
  purchase_date?: string;
  vendor_name?: string | null;
  total_amount: number;
  items: ParsedPurchaseItem[];
  confidence?: number;
};

type SalePaymentRow = {
  payment_method?: string | null;
  amount?: number | string | null;
};

type DailyPurchaseItemRow = {
  is_edited?: boolean | null;
};

type ReportTransactionRow = {
  transaction_date?: string | null;
  type?: string | null;
  category?: string | null;
  description?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
};

type ReportSaleRow = {
  sale_no?: string | null;
  status?: string | null;
  created_at?: string | null;
  grand_total?: number | string | null;
  location?: {
    code?: string | null;
    name?: string | null;
  } | null;
  sale_payments?: SalePaymentRow[];
};

type ReportPurchaseRow = {
  purchase_date?: string | null;
  vendor_name?: string | null;
  status?: string | null;
  total_amount?: number | string | null;
  daily_purchase_items?: DailyPurchaseItemRow[];
};

type ReportSettlementRow = {
  session_no?: string | null;
  shift_name?: string | null;
  status?: string | null;
  opened_at?: string | null;
  total_sales?: number | string | null;
  calculated_expected_cash?: number | string | null;
  actual_cash?: number | string | null;
  cash_difference?: number | string | null;
};

function cleanPayload(
  payload: FinanceTransactionPayload,
): FinanceTransactionPayload {
  const type = payload.type;
  const category = payload.category?.trim();
  const amount = Number(payload.amount);

  if (!["INCOME", "EXPENSE"].includes(type)) {
    throw new BadRequestError("Invalid finance transaction type");
  }

  if (!category || !Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError(
      "Category and amount greater than 0 are required",
    );
  }

  return {
    transaction_date:
      payload.transaction_date || new Date().toISOString().slice(0, 10),
    type,
    category,
    description: payload.description?.trim() || null,
    amount,
    payment_method: payload.payment_method?.trim() || null,
  };
}

function numberValue(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function normalizeMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new BadRequestError("Month must use YYYY-MM format");
  }

  const dateFrom = `${month}-01`;
  const end = new Date(`${dateFrom}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);

  return {
    dateFrom,
    dateTo: end.toISOString().slice(0, 10),
  };
}

function fallbackParsePurchaseText(rawText: string): ParsedPurchase {
  const items = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const numbers = line.match(/\d+(?:[.,]\d+)?/g) ?? [];
      const amount = numberValue(
        numbers[numbers.length - 1]?.replace(",", "."),
      );
      const name = line
        .replace(/\d+(?:[.,]\d+)?/g, "")
        .replace(/rp|idr|x|@/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        item_name: name || line,
        qty: 1,
        unit: null,
        unit_price: amount,
        subtotal: amount,
        category: "Daily Store Expense",
      };
    })
    .filter((item) => item.subtotal > 0);

  return {
    total_amount: items.reduce((sum, item) => sum + item.subtotal, 0),
    items,
    confidence: 0.45,
  };
}

function normalizeParsedPurchase(value: unknown): ParsedPurchase {
  const input = (value ?? {}) as {
    purchase_date?: string;
    vendor_name?: string | null;
    total_amount?: unknown;
    items?: unknown[];
    confidence?: number;
  };

  const items = (Array.isArray(input.items) ? input.items : [])
    .map((item) => {
      const row = item as Record<string, unknown>;
      const qty = numberValue(row.qty || 1) || 1;
      const unitPrice = numberValue(row.unit_price);
      const subtotal =
        numberValue(row.subtotal) || qty * unitPrice;

      return {
        item_name: String(row.item_name || row.name || "").trim(),
        qty,
        unit: row.unit ? String(row.unit) : null,
        unit_price: unitPrice || subtotal / qty,
        subtotal,
        category:
          String(row.category || "Daily Store Expense").trim() ||
          "Daily Store Expense",
      };
    })
    .filter((item) => item.item_name && item.subtotal >= 0);

  return {
    purchase_date: input.purchase_date,
    vendor_name: input.vendor_name ?? null,
    total_amount:
      numberValue(input.total_amount) ||
      items.reduce((sum, item) => sum + item.subtotal, 0),
    items,
    confidence: input.confidence,
  };
}

async function parseWithDeepSeek(rawText: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return {
      provider: "fallback",
      result: fallbackParsePurchaseText(rawText),
    };
  }

  const response = await fetch(
    "https://api.deepseek.com/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "Extract Indonesian store purchase notes into strict JSON with keys purchase_date, vendor_name, total_amount, confidence, items. Each item has item_name, qty, unit, unit_price, subtotal, category. Return JSON only.",
          },
          {
            role: "user",
            content: rawText,
          },
        ],
        stream: false,
      }),
    },
  );

  if (!response.ok) {
    throw new BadRequestError("DeepSeek parsing failed");
  }

  const body = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = body.choices?.[0]?.message?.content;

  if (!content) {
    throw new BadRequestError("DeepSeek returned empty result");
  }

  return {
    provider: "deepseek",
    result: normalizeParsedPurchase(JSON.parse(content)),
  };
}

function cleanDailyPurchasePayload(
  payload: DailyPurchasePayload,
): DailyPurchasePayload {
  const items = payload.items.map((item) => ({
    ...item,
    item_name: item.item_name.trim(),
    qty: numberValue(item.qty) || 1,
    unit: item.unit?.trim() || null,
    unit_price: numberValue(item.unit_price),
    subtotal:
      numberValue(item.subtotal) ||
      (numberValue(item.qty) || 1) * numberValue(item.unit_price),
    category: item.category?.trim() || "Daily Store Expense",
    ai_original_value: item.ai_original_value ?? null,
    is_edited: Boolean(item.is_edited),
  }));

  const invalidItem = items.find(
    (item) =>
      !item.item_name ||
      !item.category ||
      item.qty <= 0 ||
      item.unit_price <= 0 ||
      item.subtotal <= 0,
  );

  if (items.length === 0) {
    throw new BadRequestError("At least one purchase item is required");
  }

  if (invalidItem) {
    throw new BadRequestError(
      "Purchase item name, category, quantity, and price greater than 0 are required",
    );
  }

  return {
    ...payload,
    purchase_date:
      payload.purchase_date || new Date().toISOString().slice(0, 10),
    vendor_name: payload.vendor_name?.trim() || null,
    receipt_photo_url: payload.receipt_photo_url || null,
    ai_raw_text: payload.ai_raw_text || null,
    ai_json_result: payload.ai_json_result ?? null,
    ai_provider: payload.ai_provider || null,
    status: payload.status ?? "DRAFT_AI",
    total_amount:
      numberValue(payload.total_amount) ||
      items.reduce((sum, item) => sum + item.subtotal, 0),
    items,
  };
}

function saleDate(sale: ReportSaleRow) {
  return String(sale.created_at ?? "").slice(0, 10);
}

function settlementDate(settlement: ReportSettlementRow) {
  return String(settlement.opened_at ?? "").slice(0, 10);
}

function paymentTotal(sale: ReportSaleRow, method: "CASH" | "NONCASH") {
  const payments = Array.isArray(sale.sale_payments)
    ? sale.sale_payments
    : [];

  return payments
    .filter((payment) => payment.payment_method === method)
    .reduce((sum, payment) => sum + numberValue(payment.amount), 0);
}

function section(title: string, rows: Array<Array<string | number>>) {
  return [[""], [title], ...rows];
}

function collectReportDates(params: {
  dateFrom: string;
  transactions: ReportTransactionRow[];
  sales: ReportSaleRow[];
  purchases: ReportPurchaseRow[];
  settlements: ReportSettlementRow[];
}) {
  const dates = new Set<string>();

  for (const row of params.transactions) {
    if (row.transaction_date) dates.add(row.transaction_date);
  }

  for (const row of params.sales) {
    const date = saleDate(row);
    if (date) dates.add(date);
  }

  for (const row of params.purchases) {
    if (row.purchase_date) dates.add(row.purchase_date);
  }

  for (const row of params.settlements) {
    const date = settlementDate(row);
    if (date) dates.add(date);
  }

  return [...(dates.size > 0 ? dates : new Set([params.dateFrom]))].sort();
}

function buildDailySheets(params: {
  dateFrom: string;
  dateTo: string;
  transactions: ReportTransactionRow[];
  sales: ReportSaleRow[];
  purchases: ReportPurchaseRow[];
  settlements: ReportSettlementRow[];
}) {
  const dates = collectReportDates(params);

  return Object.fromEntries(
    dates.map((date) => {
      const transactions = params.transactions.filter(
        (row) => row.transaction_date === date,
      );
      const sales = params.sales.filter((row) => saleDate(row) === date);
      const purchases = params.purchases.filter(
        (row) => row.purchase_date === date,
      );
      const settlements = params.settlements.filter(
        (row) => settlementDate(row) === date,
      );
      const income = transactions
        .filter((row) => row.type === "INCOME")
        .reduce((sum, row) => sum + numberValue(row.amount), 0);
      const expense = transactions
        .filter((row) => row.type === "EXPENSE")
        .reduce((sum, row) => sum + numberValue(row.amount), 0);
      const cashSales = sales.reduce(
        (sum, sale) => sum + paymentTotal(sale, "CASH"),
        0,
      );
      const noncashSales = sales.reduce(
        (sum, sale) => sum + paymentTotal(sale, "NONCASH"),
        0,
      );

      const values = [
        ["Daily Finance Report", date],
        ["Generated At", new Date().toISOString()],
        ...section("Summary", [
          ["Metric", "Amount"],
          ["Income", income],
          ["Expense", expense],
          ["Balance", income - expense],
          ["Cash Sales", cashSales],
          ["Noncash Sales", noncashSales],
          ["POS Sales Count", sales.length],
          ["Daily Purchases", purchases.length],
        ]),
        ...section("Transactions", [
          ["Date", "Type", "Category", "Description", "Amount", "Payment"],
          ...transactions.map((row) => [
            row.transaction_date ?? "",
            row.type ?? "",
            row.category ?? "",
            row.description ?? "",
            numberValue(row.amount),
            row.payment_method ?? "",
          ]),
        ]),
        ...section("POS Sales", [
          ["Time", "Sale No", "Outlet", "Status", "Cash", "Noncash", "Total"],
          ...sales.map((sale) => [
            String(sale.created_at ?? ""),
            sale.sale_no ?? "",
            sale.location?.name || sale.location?.code || "",
            sale.status ?? "",
            paymentTotal(sale, "CASH"),
            paymentTotal(sale, "NONCASH"),
            numberValue(sale.grand_total),
          ]),
        ]),
        ...section("Daily Purchases", [
          ["Date", "Vendor", "Status", "Total", "Edited Items"],
          ...purchases.map((row) => {
            const items = Array.isArray(row.daily_purchase_items)
              ? row.daily_purchase_items
              : [];

            return [
              row.purchase_date ?? "",
              row.vendor_name ?? "",
              row.status ?? "",
              numberValue(row.total_amount),
              items.filter((item) => item.is_edited).length,
            ];
          }),
        ]),
        ...section("Cashier Settlement", [
          ["Session", "Shift", "Status", "Sales", "Expected", "Actual", "Diff"],
          ...settlements.map((row) => [
            row.session_no ?? "",
            row.shift_name ?? "",
            row.status ?? "",
            numberValue(row.total_sales),
            numberValue(row.calculated_expected_cash),
            row.actual_cash ?? "",
            row.cash_difference ?? "",
          ]),
        ]),
      ];

      return [date, values];
    }),
  );
}

export class FinanceService {
  async getTransactions(params?: {
    search?: string;
    type?: string;
    limit?: number;
  }) {
    return financeRepository.findAll(params);
  }

  async getSummary() {
    const rows = await financeRepository.findAll({
      limit: 1000,
    });

    const income = rows
      .filter((row) => row.type === "INCOME")
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const expense = rows
      .filter((row) => row.type === "EXPENSE")
      .reduce((sum, row) => sum + Number(row.amount), 0);

    return {
      income,
      expense,
      balance: income - expense,
      transaction_count: rows.length,
    };
  }

  async createTransaction(payload: FinanceTransactionPayload) {
    return financeRepository.create(cleanPayload(payload));
  }

  async updateTransaction(
    id: string,
    payload: Partial<FinanceTransactionPayload>,
  ) {
    return financeRepository.update(id, cleanPayload(payload as FinanceTransactionPayload));
  }

  async deleteTransaction(id: string) {
    await financeRepository.delete(id);
  }

  async getCashierSettlements(params?: {
    status?: string;
    limit?: number;
  }) {
    return financeRepository.findCashierSettlements(params);
  }

  async getPosSales(params?: {
    status?: string;
    limit?: number;
  }) {
    return financeRepository.findPosSales(params);
  }

  async parseDailyPurchase(rawText: string) {
    if (!rawText?.trim()) {
      throw new BadRequestError("Purchase text is required");
    }

    return parseWithDeepSeek(rawText.trim());
  }

  async getDailyPurchases(params?: {
    status?: string;
    limit?: number;
  }) {
    return financeRepository.findDailyPurchases(params);
  }

  async createDailyPurchase(
    userId: string,
    payload: DailyPurchasePayload,
  ) {
    return financeRepository.createDailyPurchase(
      cleanDailyPurchasePayload({
        ...payload,
        reviewed_by: userId,
      }),
    );
  }

  async updateDailyPurchase(
    userId: string,
    id: string,
    payload: DailyPurchasePayload,
  ) {
    return financeRepository.updateDailyPurchase(
      id,
      cleanDailyPurchasePayload({
        ...payload,
        reviewed_by: userId,
        status: "NEEDS_REVIEW",
      }),
    );
  }

  async approveDailyPurchase(userId: string, id: string) {
    const batch = await financeRepository.findDailyPurchaseById(id);

    if (!batch) {
      throw new BadRequestError("Daily purchase not found");
    }

    if (batch.status === "APPROVED") {
      return batch;
    }

    const transaction = await financeRepository.create({
      transaction_date: batch.purchase_date,
      type: "EXPENSE",
      category: "Daily Store Purchase",
      description:
        batch.vendor_name ||
        `Daily purchase ${batch.purchase_date}`,
      amount: numberValue(batch.total_amount),
      payment_method: "CASH",
    });

    return financeRepository.approveDailyPurchase({
      id,
      approvedBy: userId,
      financeTransactionId: transaction.id,
    });
  }

  async generateMonthlyReport(params: {
    month: string;
    sync_google?: boolean;
  }) {
    const { dateFrom, dateTo } = normalizeMonth(params.month);
    const [transactions, sales, purchases, settlements] =
      await Promise.all([
        financeRepository.findReportTransactions({
          dateFrom,
          dateTo,
        }),
        financeRepository.findReportSales({
          dateFrom,
          dateTo,
        }),
        financeRepository.findReportDailyPurchases({
          dateFrom,
          dateTo,
        }),
        financeRepository.findCashierSettlements({
          limit: 1000,
        }),
      ]);

    const income = transactions
      .filter((row) => row.type === "INCOME")
      .reduce((sum, row) => sum + numberValue(row.amount), 0);
    const expense = transactions
      .filter((row) => row.type === "EXPENSE")
      .reduce((sum, row) => sum + numberValue(row.amount), 0);
    const cashSales = sales.reduce((sum, sale) => {
      const payments: SalePaymentRow[] = Array.isArray(sale.sale_payments)
        ? sale.sale_payments
        : [];

      return (
        sum +
        payments
          .filter((payment) => payment.payment_method === "CASH")
          .reduce(
            (paymentSum, payment) =>
              paymentSum + numberValue(payment.amount),
            0,
          )
      );
    }, 0);
    const noncashSales = sales.reduce((sum, sale) => {
      const payments: SalePaymentRow[] = Array.isArray(sale.sale_payments)
        ? sale.sale_payments
        : [];

      return (
        sum +
        payments
          .filter((payment) => payment.payment_method === "NONCASH")
          .reduce(
            (paymentSum, payment) =>
              paymentSum + numberValue(payment.amount),
            0,
          )
      );
    }, 0);

    const reportSettlements = settlements.filter((row) => {
      const openedAt = String(row.opened_at ?? "").slice(0, 10);

      return openedAt >= dateFrom && openedAt <= dateTo;
    });

    const sheets = buildDailySheets({
      dateFrom,
      dateTo,
      transactions,
      sales,
      purchases,
      settlements: reportSettlements,
    });

    // A transient failure while syncing to Google Sheets (expired
    // credentials, rate limiting, a network blip) must not take
    // down the whole monthly report — the report data above is
    // already computed and should still be returned to the user,
    // with the sync failure reported alongside it instead of
    // thrown as a 500/400 for the whole request.
    const google = params.sync_google
      ? await syncGoogleSheet({
          sheets,
        }).catch((error) => ({
          synced: false as const,
          reason:
            error instanceof Error
              ? error.message
              : "Google Sheets sync failed",
        }))
      : {
          synced: false,
          reason: "Sync not requested",
        };

    return {
      month: params.month,
      date_from: dateFrom,
      date_to: dateTo,
      summary: {
        income,
        expense,
        balance: income - expense,
        cash_sales: cashSales,
        noncash_sales: noncashSales,
        sales_count: sales.length,
        daily_purchase_count: purchases.length,
      },
      sheets,
      google,
    };
  }
}
