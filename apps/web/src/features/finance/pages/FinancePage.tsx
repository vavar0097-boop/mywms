import {
  Camera,
  Check,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
  Download,
  Printer,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/shared/lib/api/error";
import { masterDataService } from "@/features/transfers/services/master-data.service";
import { toast } from "@/shared/ui/toast";
import {
  FinancePayload,
  FinanceSummary,
  FinanceTransaction,
  CashierSettlement,
  DailyPurchase,
  DailyPurchaseItem,
  PosSaleFinanceRow,
  MonthlyReport,
  financeService,
} from "../services/finance.service";

type FinanceForm = {
  transaction_date: string;
  outlet_id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: string;
  payment_method: string;
};

type PurchaseForm = {
  id?: string;
  purchase_date: string;
  vendor_name: string;
  receipt_photo_url: string;
  raw_text: string;
  ai_provider: string;
  ai_json_result: Record<string, unknown> | null;
};

const today = new Date().toISOString().slice(0, 10);

function isoWeekRange(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  const dateFrom = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 6);
  return { date_from: dateFrom, date_to: date.toISOString().slice(0, 10) };
}

function exportFinanceReport(report: MonthlyReport) {
  const rows: unknown[][] = [
    ["Periode", report.period ?? report.month ?? ""],
    ["Dari", report.date_from ?? ""],
    ["Sampai", report.date_to ?? ""],
    ["Pemasukan", report.summary.income],
    ["Pengeluaran", report.summary.expense],
    ["Saldo", report.summary.balance],
    ["Penjualan tunai", report.summary.cash_sales],
    ["Penjualan non-tunai", report.summary.noncash_sales],
    [],
    ["Rekap per outlet"],
    ["Outlet", "Pemasukan", "Pengeluaran", "Tunai", "Non-tunai", "Pembelian harian", "Jumlah transaksi", "Shift", "Setoran"],
    ...(report.outlet_summary ?? []).map((outlet) => [
      outlet.outlet_name,
      outlet.income,
      outlet.expense,
      outlet.cash_sales,
      outlet.noncash_sales,
      outlet.daily_purchase_total,
      outlet.sales_count,
      outlet.shift_count,
      outlet.deposits,
    ]),
    [],
  ];
  for (const [sheetName, sheetRows] of Object.entries(report.sheets ?? {})) {
    rows.push([sheetName]);
    rows.push(...sheetRows);
    rows.push([]);
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-keuangan-${report.date_from ?? ""}-${report.date_to ?? ""}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const emptyForm: FinanceForm = {
  transaction_date: today,
  outlet_id: "",
  type: "INCOME",
  category: "",
  description: "",
  amount: "",
  payment_method: "",
};

const emptyPurchaseForm: PurchaseForm = {
  purchase_date: today,
  vendor_name: "",
  receipt_photo_url: "",
  raw_text: "",
  ai_provider: "",
  ai_json_result: null,
};

function money(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function numericValue(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function toPayload(form: FinanceForm): FinancePayload {
  return {
    transaction_date: form.transaction_date,
    outlet_id: form.outlet_id || null,
    type: form.type,
    category: form.category.trim(),
    description: form.description.trim() || null,
    amount: Number(form.amount),
    payment_method: form.payment_method.trim() || null,
  };
}

export function FinancePage() {
  const [outlets, setOutlets] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [settlements, setSettlements] = useState<CashierSettlement[]>([]);
  const [posSales, setPosSales] = useState<PosSaleFinanceRow[]>([]);
  const [dailyPurchases, setDailyPurchases] = useState<DailyPurchase[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    income: 0,
    expense: 0,
    balance: 0,
    transaction_count: 0,
  });
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] =
    useState<FinanceTransaction | null>(null);
  const [form, setForm] = useState<FinanceForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [purchaseForm, setPurchaseForm] =
    useState<PurchaseForm>(emptyPurchaseForm);
  const [purchaseItems, setPurchaseItems] = useState<DailyPurchaseItem[]>([]);
  const [isParsingPurchase, setIsParsingPurchase] = useState(false);
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [reportMode, setReportMode] = useState<"weekly" | "monthly">("weekly");
  const [reportWeekDate, setReportWeekDate] = useState(today);
  const [syncGoogle, setSyncGoogle] = useState(false);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    masterDataService.getLocations()
      .then((locations) => setOutlets(locations
        .filter((location) => location.level?.toUpperCase() === "OUTLET")
        .map((location) => ({ id: location.id, code: location.code, name: location.name }))))
      .catch(() => setOutlets([]));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadFinance() {
      setIsLoading(true);

      try {
        const [
          rows,
          nextSummary,
          nextSettlements,
          nextPosSales,
          nextDailyPurchases,
        ] =
          await Promise.all([
          financeService.getTransactions({
            limit: 100,
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(type ? { type } : {}),
          }),
          financeService.getSummary(),
          financeService.getCashierSettlements({
            limit: 20,
          }),
          financeService.getPosSales({
            limit: 20,
          }),
          financeService.getDailyPurchases({
            limit: 20,
          }),
        ]);

        if (!mounted) return;

        setTransactions(rows);
        setSummary(nextSummary);
        setSettlements(nextSettlements);
        setPosSales(nextPosSales);
        setDailyPurchases(nextDailyPurchases);
      } catch (error) {
        if (!mounted) return;

        toast.error(
          "Finance failed to load",
          getApiErrorMessage(error),
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    const timer = window.setTimeout(loadFinance, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [search, type, reloadKey]);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(row: FinanceTransaction) {
    setEditing(row);
    setForm({
      transaction_date: row.transaction_date,
      outlet_id: row.outlet_id || "",
      type: row.type,
      category: row.category,
      description: row.description || "",
      amount: String(row.amount),
      payment_method: row.payment_method || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.category.trim() || numericValue(form.amount) <= 0) {
      toast.error(
        "Finance form incomplete",
        "Category and amount greater than 0 are required.",
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editing) {
        await financeService.updateTransaction(
          editing.id,
          toPayload(form),
        );
        toast.success("Transaction updated", form.category);
      } else {
        await financeService.createTransaction(toPayload(form));
        toast.success("Transaction created", form.category);
      }

      closeModal();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        editing
          ? "Transaction update failed"
          : "Transaction creation failed",
        getApiErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(row: FinanceTransaction) {
    if (!window.confirm(`Delete ${row.category} transaction?`)) return;

    try {
      await financeService.deleteTransaction(row.id);
      toast.success("Transaction deleted", row.category);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        "Transaction delete failed",
        getApiErrorMessage(error),
      );
    }
  }

  async function handleVoidSale(row: PosSaleFinanceRow) {
    const reason = window.prompt(
      `Void sale ${row.sale_no}? Input reason.`,
    );

    if (!reason?.trim()) return;

    try {
      await financeService.voidPosSale(row.id, reason.trim());
      toast.success("Sale voided", row.sale_no);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error("Void sale failed", getApiErrorMessage(error));
    }
  }

  function purchaseTotal(items = purchaseItems) {
    return items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  }

  function updatePurchaseItem(
    index: number,
    patch: Partial<DailyPurchaseItem>,
  ) {
    setPurchaseItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next = {
          ...item,
          ...patch,
          is_edited: true,
        };
        const qty = Number(next.qty || 1) || 1;
        const unitPrice = Number(next.unit_price || 0);

        return {
          ...next,
          subtotal:
            patch.subtotal !== undefined
              ? Number(patch.subtotal)
              : qty * unitPrice,
        };
      }),
    );
  }

  async function handleReceiptFile(file?: File | null) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setPurchaseForm((current) => ({
        ...current,
        receipt_photo_url: String(reader.result || ""),
      }));
    };

    reader.readAsDataURL(file);
  }

  async function handleParsePurchase() {
    if (!purchaseForm.raw_text.trim()) {
      toast.error("Purchase note required", "Input OCR/manual text first.");
      return;
    }

    setIsParsingPurchase(true);

    try {
      const parsed = await financeService.parseDailyPurchase(
        purchaseForm.raw_text,
      );

      setPurchaseForm((current) => ({
        ...current,
        purchase_date:
          parsed.result.purchase_date || current.purchase_date,
        vendor_name:
          parsed.result.vendor_name || current.vendor_name,
        ai_provider: parsed.provider,
        ai_json_result: parsed.result as unknown as Record<string, unknown>,
      }));
      setPurchaseItems(
        parsed.result.items.map((item) => ({
          ...item,
          ai_original_value: item as unknown as Record<string, unknown>,
          is_edited: false,
        })),
      );
      toast.success("Purchase parsed", parsed.provider);
    } catch (error) {
      toast.error("AI parse failed", getApiErrorMessage(error));
    } finally {
      setIsParsingPurchase(false);
    }
  }

  async function handleSavePurchase() {
    if (purchaseItems.length === 0) {
      toast.error("No purchase items", "Parse or add items first.");
      return;
    }

    const invalidItem = purchaseItems.find(
      (item) =>
        !item.item_name.trim() ||
        !item.category.trim() ||
        numericValue(item.qty) <= 0 ||
        numericValue(item.unit_price) <= 0 ||
        numericValue(item.subtotal) <= 0,
    );

    if (invalidItem) {
      toast.error(
        "Purchase item incomplete",
        "Item name, category, quantity, and price greater than 0 are required.",
      );
      return;
    }

    if (!purchaseForm.purchase_date) {
      toast.error("Purchase date required");
      return;
    }

    setIsSavingPurchase(true);

    try {
      const payload = {
        purchase_date: purchaseForm.purchase_date,
        vendor_name: purchaseForm.vendor_name || null,
        receipt_photo_url: purchaseForm.receipt_photo_url || null,
        ai_raw_text: purchaseForm.raw_text || null,
        ai_json_result: purchaseForm.ai_json_result,
        ai_provider: purchaseForm.ai_provider || "manual",
        status: "NEEDS_REVIEW" as const,
        total_amount: purchaseTotal(),
        items: purchaseItems,
      };

      if (purchaseForm.id) {
        await financeService.updateDailyPurchase(purchaseForm.id, payload);
      } else {
        await financeService.createDailyPurchase(payload);
      }

      toast.success("Daily purchase saved");
      setPurchaseForm(emptyPurchaseForm);
      setPurchaseItems([]);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error("Save purchase failed", getApiErrorMessage(error));
    } finally {
      setIsSavingPurchase(false);
    }
  }

  function reviewPurchase(row: DailyPurchase) {
    setPurchaseForm({
      id: row.id,
      purchase_date: row.purchase_date,
      vendor_name: row.vendor_name || "",
      receipt_photo_url: row.receipt_photo_url || "",
      raw_text: row.ai_raw_text || "",
      ai_provider: row.ai_provider || "",
      ai_json_result: row.ai_json_result || null,
    });
    setPurchaseItems(row.daily_purchase_items || []);
  }

  async function approvePurchase(row: DailyPurchase) {
    try {
      await financeService.approveDailyPurchase(row.id);
      toast.success("Daily purchase approved");
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error("Approve failed", getApiErrorMessage(error));
    }
  }

  async function handleGenerateReport() {
    if ((reportMode === "weekly" && !reportWeekDate) || (reportMode === "monthly" && !reportMonth)) return;
    const range = reportMode === "weekly"
      ? isoWeekRange(reportWeekDate)
      : { date_from: `${reportMonth}-01`, date_to: new Date(Date.UTC(Number(reportMonth.slice(0, 4)), Number(reportMonth.slice(5, 7)), 0)).toISOString().slice(0, 10) };

    setIsGeneratingReport(true);

    try {
      const nextReport = await financeService.generateReport({
        ...range,
        period: reportMode === "weekly" ? "Mingguan" : reportMonth,
        sync_google: syncGoogle,
      });

      setReport(nextReport);
      toast.success(
        "Monthly report generated",
        nextReport.google.synced ? "Synced to Google Sheets" : undefined,
      );
    } catch (error) {
      toast.error("Report failed", getApiErrorMessage(error));
    } finally {
      setIsGeneratingReport(false);
    }
  }

  return (
    <div className="space-y-6">
      <style>{`@media print { body * { visibility: hidden !important; } #finance-report-output, #finance-report-output * { visibility: visible !important; } #finance-report-output { position: absolute; inset: 0; width: 100%; } .print-hide { display: none !important; } }`}</style>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Finance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track income, expenses, and POS-ready finance movement.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add Transaction
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Income", summary.income],
          ["Expense", summary.expense],
          ["Balance", summary.balance],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {money(value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Daily Purchase AI Draft
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Foto/catatan belanja diparse jadi draft expense.
              </p>
            </div>
            <Camera className="text-slate-400" size={22} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={purchaseForm.purchase_date}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  purchase_date: event.target.value,
                }))
              }
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
              required
            />
            <input
              value={purchaseForm.vendor_name}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  vendor_name: event.target.value,
                }))
              }
              placeholder="Vendor / toko"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) =>
                handleReceiptFile(event.target.files?.[0])
              }
              className="h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none md:col-span-2"
            />
            <textarea
              value={purchaseForm.raw_text}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  raw_text: event.target.value,
                }))
              }
              placeholder="Paste OCR result or type shopping note here"
              className="min-h-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none md:col-span-2"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleParsePurchase}
              disabled={isParsingPurchase}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Camera size={16} />
              {isParsingPurchase ? "Processing..." : "AI Process"}
            </button>
            <button
              type="button"
              onClick={() =>
                setPurchaseItems((current) => [
                  ...current,
                  {
                    item_name: "",
                    qty: 1,
                    unit: "",
                    unit_price: 0,
                    subtotal: 0,
                    category: "Daily Store Expense",
                    is_edited: true,
                  },
                ])
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>

          {purchaseItems.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["Item", "Qty", "Unit", "Price", "Subtotal", "Cat"].map(
                      (head) => (
                        <th
                          key={head}
                          className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500"
                        >
                          {head}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input
                          value={item.item_name}
                          onChange={(event) =>
                            updatePurchaseItem(index, {
                              item_name: event.target.value,
                            })
                          }
                          className="h-9 w-40 rounded-lg border border-slate-200 px-2 text-sm"
                          required
                        />
                        {item.is_edited ? (
                          <span className="ml-2 text-xs font-bold text-amber-600">
                            edited
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(event) =>
                            updatePurchaseItem(index, {
                              qty: Number(event.target.value),
                            })
                          }
                          className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.unit || ""}
                          onChange={(event) =>
                            updatePurchaseItem(index, {
                              unit: event.target.value,
                            })
                          }
                          className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.unit_price}
                          onChange={(event) =>
                            updatePurchaseItem(index, {
                              unit_price: Number(event.target.value),
                            })
                          }
                          className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm"
                          required
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold">
                        {money(item.subtotal)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.category}
                          onChange={(event) =>
                            updatePurchaseItem(index, {
                              category: event.target.value,
                            })
                          }
                          className="h-9 w-40 rounded-lg border border-slate-200 px-2 text-sm"
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-bold">
                  Total {money(purchaseTotal())}
                </p>
                <button
                  type="button"
                  onClick={handleSavePurchase}
                  disabled={isSavingPurchase}
                  className="inline-flex h-10 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSavingPurchase ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {reportMode === "weekly" ? "Weekly Report" : "Monthly Report"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Generate owner/finance report.
              </p>
            </div>
            <FileSpreadsheet className="text-slate-400" size={22} />
          </div>
          <div className="mt-4 space-y-3">
            <select value={reportMode} onChange={(event) => setReportMode(event.target.value as "weekly" | "monthly")} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
            </select>
            {reportMode === "weekly" ? <input type="date" value={reportWeekDate} onChange={(event) => setReportWeekDate(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none" required /> : <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none" required />}
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={syncGoogle}
                onChange={(event) => setSyncGoogle(event.target.checked)}
              />
              Sync Google Sheet
            </label>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isGeneratingReport ? "Generating..." : "Generate Report"}
            </button>
          </div>

          {report ? (
            <div id="finance-report-output" className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
              <div className="print-hide flex gap-2">
                <button type="button" onClick={() => exportFinanceReport(report)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Download size={15} /> Export Excel (CSV)</button>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Printer size={15} /> Cetak</button>
              </div>
              <p><strong>Periode:</strong> {report.date_from} – {report.date_to}</p>
              <div className="flex justify-between">
                <span>Income</span>
                <strong>{money(report.summary.income)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Expense</span>
                <strong>{money(report.summary.expense)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Balance</span>
                <strong>{money(report.summary.balance)}</strong>
              </div>
              <div className="mt-3 overflow-x-auto border-t border-slate-200 pt-3">
                <p className="mb-2 font-bold">Rekap per outlet</p>
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-1 pr-3">Outlet</th>
                      <th className="py-1 pr-3 text-right">Masuk</th>
                      <th className="py-1 text-right">Keluar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.outlet_summary ?? []).map((outlet) => (
                      <tr key={outlet.outlet_id ?? outlet.outlet_name} className="border-b last:border-0">
                        <td className="py-1 pr-3">{outlet.outlet_name}</td>
                        <td className="py-1 pr-3 text-right">{money(outlet.income)}</td>
                        <td className="py-1 text-right">{money(outlet.expense)}</td>
                      </tr>
                    ))}
                    {(report.outlet_summary ?? []).length === 0 ? (
                      <tr><td className="py-2 text-slate-500" colSpan={3}>Belum ada transaksi outlet pada periode ini.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Google:{" "}
                {report.google.synced
                  ? `synced (${report.google.sheet_count ?? Object.keys(report.sheets ?? {}).length} sheets)`
                  : report.google.reason || "not synced"}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Sheets: {Object.keys(report.sheets ?? {}).join(", ") || "-"}
              </p>
              {report.google.spreadsheet_url ? (
                <a
                  href={report.google.spreadsheet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-xs font-bold text-teal-700 underline-offset-4 hover:underline"
                >
                  Open Google Sheet
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-bold text-slate-950">
            Daily Purchase Files
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Outlet", "Vendor", "Status", "Total", "Actions"].map(
                  (head) => (
                    <th
                      key={head}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 last:text-right"
                    >
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dailyPurchases.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No daily purchase files yet.
                  </td>
                </tr>
              ) : (
                dailyPurchases.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-4 text-sm">
                      {row.purchase_date}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {outlets.find((outlet) => outlet.id === row.outlet_id)?.name || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold">
                      {row.vendor_name || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {row.status}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold">
                      {money(row.total_amount)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-2">
                        {row.status !== "APPROVED" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => reviewPurchase(row)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
                              aria-label="Review purchase"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => approvePurchase(row)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 text-emerald-700"
                              aria-label="Approve purchase"
                            >
                              <Check size={15} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-bold text-slate-950">
              Cashier Settlement
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Shift cash, deposits, expenses, and difference.
            </p>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Outlet", "Session / Shift", "Sales", "Expenses", "Deposits", "Expected", "Actual", "Diff"].map(
                    (head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                      >
                        {head}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {settlements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No cashier shifts yet.
                    </td>
                  </tr>
                ) : (
                  settlements.map((row) => (
                    <tr key={row.cashier_session_id}>
                      <td className="px-4 py-3 text-sm font-medium">{outlets.find((outlet) => outlet.id === row.location_id)?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-950">
                          {row.session_no}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.shift_name} - {row.status}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {money(row.total_sales)}
                      </td>
                      <td className="px-4 py-3 text-sm">{money(row.total_expenses)}</td>
                      <td className="px-4 py-3 text-sm">{money(row.total_deposits)}</td>
                      <td className="px-4 py-3 text-sm">
                        {money(row.calculated_expected_cash)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.actual_cash === null ||
                        row.actual_cash === undefined
                          ? "-"
                          : money(row.actual_cash)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">
                        {row.cash_difference === null ||
                        row.cash_difference === undefined
                          ? "-"
                          : money(row.cash_difference)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-bold text-slate-950">
              POS Sales
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent paid and voided cashier sales.
            </p>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Sale", "Cashier", "Amount", "Status", ""].map(
                    (head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 last:text-right"
                      >
                        {head}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {posSales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No POS sales yet.
                    </td>
                  </tr>
                ) : (
                  posSales.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-950">
                          {row.sale_no}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.location?.name || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.cashier?.full_name ||
                          row.cashier?.username ||
                          "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {money(row.grand_total)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.status}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.status === "PAID" ? (
                          <button
                            type="button"
                            onClick={() => handleVoidSale(row)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                            aria-label="Void sale"
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative w-full md:w-80">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search category, note, payment"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
              <option value="">All types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Refresh finance"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Type", "Category", "Outlet", "Amount", "Payment", "Actions"].map(
                  (head) => (
                    <th
                      key={head}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 last:text-right"
                    >
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    Loading finance...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    No finance transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {row.transaction_date}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-950">
                      {row.type}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-950">
                        {row.category}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.description || "No description"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {row.outlet?.name || row.outlet?.code || "Semua outlet"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-950">
                      {money(row.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {row.payment_method || "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          aria-label="Edit transaction"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                          aria-label="Delete transaction"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-950">
                {editing ? "Edit Transaction" : "Add Transaction"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close finance form"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="date"
                  value={form.transaction_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      transaction_date: event.target.value,
                    }))
                  }
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  required
                />
                <select value={form.outlet_id} onChange={(event) => setForm((current) => ({ ...current, outlet_id: event.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none">
                  <option value="">Semua outlet</option>
                  {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.code} — {outlet.name}</option>)}
                </select>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as "INCOME" | "EXPENSE",
                    }))
                  }
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  required
                >
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
                <input
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  placeholder="Category"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  required
                />
                <input
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="Amount"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  required
                />
                <input
                  value={form.payment_method}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      payment_method: event.target.value,
                    }))
                  }
                  placeholder="Payment method"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none md:col-span-2"
                />
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Description"
                  className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none md:col-span-2"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
