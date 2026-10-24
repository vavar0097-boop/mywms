import {
  ArrowLeftRight,
  Boxes,
  ExternalLink,
  FileSpreadsheet,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  masterDataPageService,
} from "@/features/master-data/services/master-data-page.service";
import {
  financeService,
  PosSaleFinanceRow,
} from "@/features/finance/services/finance.service";
import { globalReportService } from "@/features/global-report/services/global-report.service";
import { stockService } from "@/features/stocks/services/stock.service";
import { transferService } from "@/features/transfers/services/transfer.service";
import {
  hasPermission,
  PERMISSIONS,
} from "@/shared/auth/permissions";
import { getApiErrorMessage } from "@/shared/lib/api/error";
import { toast } from "@/shared/ui/toast";
import { useAuthStore } from "@/stores/auth.store";

type Stat = {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  tone: string;
  accent: string;
};

type MovementSummary = {
  salesCount: number;
  salesTotal: number;
};

type OutletSalesSummary = {
  key: string;
  name: string;
  code: string;
  salesCount: number;
  salesTotal: number;
  cashTotal: number;
  noncashTotal: number;
  lastSaleAt: string | null;
};

function numberValue(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numberValue(value));
}

function summarizeSales(sales: PosSaleFinanceRow[]) {
  return sales
    .filter((sale) => sale.status === "PAID")
    .reduce(
      (summary, sale) => ({
        salesCount: summary.salesCount + 1,
        salesTotal: summary.salesTotal + numberValue(sale.grand_total),
      }),
      {
        salesCount: 0,
        salesTotal: 0,
      },
    );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPaymentTotal(
  sale: PosSaleFinanceRow,
  method: "CASH" | "NONCASH",
) {
  return (sale.sale_payments ?? [])
    .filter((payment) => payment.payment_method === method)
    .reduce((sum, payment) => sum + numberValue(payment.amount), 0);
}

function summarizeOutletSales(
  sales: PosSaleFinanceRow[],
): OutletSalesSummary[] {
  const summary = new Map<string, OutletSalesSummary>();

  for (const sale of sales) {
    if (sale.status !== "PAID") continue;

    const code = sale.location?.code?.trim() || "";
    const name = sale.location?.name?.trim() || "Unknown Outlet";
    const key = code || name;
    const existing =
      summary.get(key) ??
      {
        key,
        name,
        code,
        salesCount: 0,
        salesTotal: 0,
        cashTotal: 0,
        noncashTotal: 0,
        lastSaleAt: null,
      };

    existing.salesCount += 1;
    existing.salesTotal += numberValue(sale.grand_total);
    existing.cashTotal += getPaymentTotal(sale, "CASH");
    existing.noncashTotal += getPaymentTotal(sale, "NONCASH");

    if (
      !existing.lastSaleAt ||
      new Date(sale.created_at).getTime() >
        new Date(existing.lastSaleAt).getTime()
    ) {
      existing.lastSaleAt = sale.created_at;
    }

    summary.set(key, existing);
  }

  return [...summary.values()].sort(
    (a, b) => b.salesTotal - a.salesTotal,
  );
}

const defaultReportFrom = new Date(Date.now() - 29 * 86400000)
  .toISOString()
  .slice(0, 10);

export function DashboardPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canReadFinance = hasPermission(role, PERMISSIONS.FINANCE_READ);
  const canReadTransfers = hasPermission(
    role,
    PERMISSIONS.TRANSFERS_READ,
  );
  const canReadStock = hasPermission(role, PERMISSIONS.STOCK_READ);
  const canReadItems = hasPermission(role, PERMISSIONS.ITEMS_READ);
  const canReadWarehouses = hasPermission(
    role,
    PERMISSIONS.WAREHOUSES_READ,
  );
  const [stats, setStats] = useState<Stat[]>([]);
  const [movementSummary, setMovementSummary] =
    useState<MovementSummary>({
      salesCount: 0,
      salesTotal: 0,
    });
  const [outletSales, setOutletSales] = useState<OutletSalesSummary[]>(
    [],
  );
  const [recentSales, setRecentSales] = useState<PosSaleFinanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    async function loadDashboard() {
      setIsLoading(true);

      try {
        const [
          transfers,
          stocks,
          items,
          warehouses,
          salesResult,
        ] = await Promise.all([
          canReadTransfers ? transferService.getTransfers() : null,
          canReadStock
            ? stockService.getCurrentStocks({
                page: 1,
                limit: 1,
              })
            : null,
          canReadItems
            ? masterDataPageService.getItems({
                page: 1,
                limit: 1,
              })
            : null,
          canReadWarehouses
            ? masterDataPageService.getWarehouses({
                limit: 100,
              })
            : null,
          canReadFinance
            ? financeService.getPosSales({
                limit: 100,
              })
            : null,
        ]);

        if (!mounted) return;

        const visibleSales = salesResult ?? [];
        const sales = summarizeSales(visibleSales);
        const salesByOutlet = summarizeOutletSales(visibleSales);
        const nextStats: Stat[] = [];

        if (canReadFinance) {
          nextStats.push({
            label: "POS Sales",
            value: sales.salesCount,
            href: "/dashboard/finance",
            icon: ShoppingCart,
            tone: "from-rose-500 to-orange-500",
            accent: "bg-rose-50 text-rose-700",
          });
        }

        if (transfers) {
          nextStats.push({
            label: "Transfers",
            value: transfers.length,
            href: "/dashboard/transfers",
            icon: ArrowLeftRight,
            tone: "from-teal-500 to-cyan-500",
            accent: "bg-teal-50 text-teal-700",
          });
        }

        if (stocks) {
          nextStats.push({
            label: "Stock Rows",
            value: stocks.pagination.total,
            href: "/dashboard/stock",
            icon: Boxes,
            tone: "from-emerald-500 to-teal-500",
            accent: "bg-emerald-50 text-emerald-700",
          });
        }

        if (items) {
          nextStats.push({
            label: "Items",
            value: items.pagination.total,
            href: "/dashboard/items",
            icon: Package,
            tone: "from-sky-500 to-indigo-500",
            accent: "bg-sky-50 text-sky-700",
          });
        }

        if (warehouses) {
          nextStats.push({
            label: "Warehouses",
            value: warehouses.length,
            href: "/dashboard/warehouses",
            icon: Warehouse,
            tone: "from-violet-500 to-fuchsia-500",
            accent: "bg-violet-50 text-violet-700",
          });
        }

        setMovementSummary(sales);
        setOutletSales(salesByOutlet);
        setRecentSales(visibleSales.slice(0, 5));
        setLastUpdatedAt(new Date());
        setStats(nextStats);
      } catch (error) {
        if (!mounted) return;

        toast.error(
          "Dashboard failed to load",
          getApiErrorMessage(error),
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();
    timer = window.setInterval(loadDashboard, 30000);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [
    canReadFinance,
    canReadItems,
    canReadStock,
    canReadTransfers,
    canReadWarehouses,
    reloadKey,
  ]);

  const total = useMemo(
    () => stats.reduce((sum, stat) => sum + stat.value, 0),
    [stats],
  );

  const maxOutletSales = Math.max(
    ...outletSales.map((outlet) => outlet.salesTotal),
    1,
  );

  async function handleGenerateGlobalReport() {
    setIsGeneratingReport(true);

    try {
      const report = await globalReportService.generate({
        date_from: defaultReportFrom,
        date_to: new Date().toISOString().slice(0, 10),
        sync_google: true,
      });

      setReportUrl(report.google.spreadsheet_url ?? null);
      toast.success(
        "Global report synced",
        report.google.synced
          ? `${report.summary.report_sheet_name || "New report sheet"} created.`
          : report.google.reason || "Report generated without sync.",
      );
    } catch (error) {
      toast.error(
        "Global report failed",
        getApiErrorMessage(error),
      );
    } finally {
      setIsGeneratingReport(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            Operations Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            POS sales, transfers, stock coverage, and master data health.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
            Updated {lastUpdatedAt ? formatDateTime(lastUpdatedAt.toISOString()) : "-"}
          </div>
          {canReadFinance && reportUrl ? (
            <a
              href={reportUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-100"
            >
              <ExternalLink size={16} />
              Open Sheet
            </a>
          ) : null}
          {canReadFinance ? (
            <button
              type="button"
              onClick={handleGenerateGlobalReport}
              disabled={isGeneratingReport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
            >
              <FileSpreadsheet size={16} />
              {isGeneratingReport
                ? "Generating..."
                : "Generate Global Report"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))
          : stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <Link
                  key={stat.href}
                  to={stat.href}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.accent}`}
                    >
                      <Icon size={21} />
                    </div>
                    <span className="text-3xl font-bold text-slate-950">
                      {stat.value}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    {stat.label}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${stat.tone}`}
                      style={{
                        width: `${Math.min(100, Math.max(12, total ? (stat.value / total) * 100 : 12))}%`,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
      </div>

      {canReadFinance ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                POS Sales by Outlet
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Paid sales grouped from the latest live POS records.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Auto refresh 30s
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
            {outletSales.length === 0 ? (
              <div className="bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                No paid POS sales found in the latest records.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {outletSales.map((outlet) => (
                  <div key={outlet.key} className="bg-white p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                          <Store size={19} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-950">
                            {outlet.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {outlet.code || "No code"} - Last sale {formatDateTime(outlet.lastSaleAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-base font-bold text-slate-950">
                          {money(outlet.salesTotal)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {outlet.salesCount.toLocaleString("id-ID")} transactions
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                        style={{
                          width: `${Math.max(6, (outlet.salesTotal / maxOutletSales) * 100)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        Cash {money(outlet.cashTotal)}
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        Noncash {money(outlet.noncashTotal)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            POS Snapshot
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Current sales total and recent cashier activity.
          </p>

          <div className="mt-6 space-y-4">
            {[
              ["Sales", movementSummary.salesCount],
              ["Sales Total", movementSummary.salesTotal],
              ["Outlets", outletSales.length],
              ["Records Loaded", recentSales.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-slate-700">
                  {label}
                </span>
                <span className="font-bold text-slate-950">
                  {label === "Sales Total"
                    ? money(value)
                    : numberValue(value).toLocaleString("id-ID")}
                </span>
              </div>
            ))}

            {recentSales.length > 0 ? (
              <div className="pt-2">
                <p className="mb-2 text-xs font-bold uppercase text-slate-400">
                  Recent sales
                </p>
                <div className="space-y-2">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-slate-600">
                        {sale.location?.name || sale.sale_no}
                      </span>
                      <span className="font-semibold text-slate-950">
                        {money(sale.grand_total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        </div>
      ) : null}
    </div>
  );
}
