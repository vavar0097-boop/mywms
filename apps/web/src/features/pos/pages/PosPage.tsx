import {
  ArrowLeftRight,
  Banknote,
  Boxes,
  Check,
  CreditCard,
  LogOut,
  Maximize2,
  Menu,
  Minus,
  Plus,
  Power,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getApiErrorMessage } from "@/shared/lib/api/error";
import { Link } from "react-router-dom";
import { PERMISSIONS, hasPermission } from "@/shared/auth/permissions";
import { Button } from "@/shared/ui/button/button";
import { FeedbackPanel } from "@/shared/ui/feedback";
import { toast } from "@/shared/ui/toast";
import { useAuthStore } from "@/stores/auth.store";

import {
  CashierSessionSummary,
  PosMenuItem,
  posService,
} from "../services/pos.service";

type CartItem = {
  menuItem: PosMenuItem;
  quantity: number;
};

type ReceiptItem = {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type DrawerAction = "expense" | "deposit" | "close" | null;

const shiftOptions = ["Pagi", "Siang"] as const;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
};

function money(value: unknown) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function numberValue(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function stockValue(menuItem: PosMenuItem) {
  if (menuItem.current_stock === null || menuItem.current_stock === undefined) {
    return null;
  }

  return numberValue(menuItem.current_stock);
}

function lockPosHistory() {
  window.history.replaceState(
    {
      page: "pos",
    },
    "",
    window.location.href,
  );
  window.history.pushState(
    {
      page: "pos-locked",
    },
    "",
    window.location.href,
  );
}

function escapeReceiptText(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function PosPage() {
  const { user, logout, isLoggingOut } = useAuthStore();
  const [session, setSession] =
    useState<CashierSessionSummary | null>(null);
  const [locations, setLocations] = useState<
    Awaited<ReturnType<typeof posService.getOutletLocations>>
  >([]);
  const [menu, setMenu] = useState<PosMenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [paymentMethod, setPaymentMethod] =
    useState<"CASH" | "NONCASH">("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [shiftName, setShiftName] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAction, setDrawerAction] =
    useState<DrawerAction>(null);
  const [expenseCategory, setExpenseCategory] =
    useState("OPERATIONAL");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseReason, setExpenseReason] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositReceiver, setDepositReceiver] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRecordingExpense, setIsRecordingExpense] =
    useState(false);
  const [isRecordingDeposit, setIsRecordingDeposit] =
    useState(false);
  const [lastSale, setLastSale] = useState<{
    sale_no: string;
    payment_method: "CASH" | "NONCASH";
    paid_amount: number;
    subtotal: number;
    change_amount: number;
    items: ReceiptItem[];
  } | null>(null);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce(
    (sum, item) =>
      sum + numberValue(item.menuItem.price) * item.quantity,
    0,
  );
  const paid = numberValue(paidAmount || subtotal);
  const changeAmount = Math.max(0, paid - subtotal);
  const canCheckout =
    cartItems.length > 0 &&
    !isPaying &&
    (paymentMethod === "NONCASH" || paid >= subtotal);

  // Category is a free-text field admins can set from
  // Settings > POS Menu, so the tab list must be derived from
  // whatever categories actually exist on the menu instead of a
  // fixed list — otherwise any custom category becomes invisible
  // outside of "ALL". "Snack" is kept as a legacy alias of
  // "Makanan" for backward compatibility with older menu data.
  function normalizeCategory(rawCategory: string | null | undefined) {
    const trimmed = rawCategory?.trim();

    if (!trimmed) return "Lainnya";
    if (trimmed === "Snack") return "Makanan";

    return trimmed;
  }

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(menu.map((item) => normalizeCategory(item.category))),
    ).sort((a, b) => a.localeCompare(b));

    return ["ALL", ...unique];
  }, [menu]);

  const currentLocationName =
    locations.find(
      (location) =>
        location.id ===
        (session?.location_id || selectedLocationId),
    )?.location_name || "Pilih Outlet";
  const cashierName =
    user?.full_name || user?.name || user?.username || "Kasir";
  const canReceiveTransfers = hasPermission(
    user?.role,
    PERMISSIONS.TRANSFERS_READ,
  );
  const activeShiftName = session?.shift_name || shiftName;

  const filteredMenu = useMemo(
    () =>
      menu.filter((item) => {
        const itemCategory = normalizeCategory(item.category);
        const categoryMatch =
          category === "ALL" || itemCategory === category;
        const query = search.trim().toLowerCase();

        if (!query) return categoryMatch;

        return (
          categoryMatch &&
          [item.menu_code, item.menu_name, item.category]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(query),
            )
        );
      }),
    [category, menu, search],
  );

  async function loadPosData() {
    setIsLoading(true);

    try {
      const [activeSession, outletLocations, menuItems] =
        await Promise.all([
          posService.getActiveSession(),
          posService.getOutletLocations(),
          posService.getMenu(),
        ]);

      setSession(activeSession);
      setLocations(outletLocations);
      setMenu(menuItems);
      setSelectedLocationId(
        activeSession?.location_id || outletLocations[0]?.id || "",
      );
      setActualCash(
        activeSession?.calculated_expected_cash
          ? String(activeSession.calculated_expected_cash)
          : "",
      );
    } catch (error) {
      toast.error("POS failed to load", getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPosData();
  }, []);

  useEffect(() => {
    const previousScrollRestoration =
      window.history.scrollRestoration;

    window.history.scrollRestoration = "manual";
    lockPosHistory();

    function handleBackNavigation() {
      setPaidAmount("");
      setDrawerOpen(false);
      setDrawerAction(null);
      setExpenseAmount("");
      setExpenseReason("");
      setDepositAmount("");
      setDepositReceiver("");
      setDepositNotes("");
      setCloseNotes("");
      setLastSale(null);
      lockPosHistory();
    }

    window.addEventListener("popstate", handleBackNavigation);

    return () => {
      window.removeEventListener("popstate", handleBackNavigation);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  useEffect(() => {
    if (paymentMethod === "NONCASH") {
      setPaidAmount(String(subtotal));
    }
  }, [paymentMethod, subtotal]);

  function addToCart(menuItem: PosMenuItem) {
    if (!menuItem.item_id) {
      toast.error(
        "Menu not ready",
        "This menu item is not linked to an inventory item.",
      );
      return;
    }

    const currentQuantity = cart[menuItem.id]?.quantity ?? 0;
    const availableStock = stockValue(menuItem);

    if (availableStock !== null && currentQuantity >= availableStock) {
      toast.error("Stock limit reached", menuItem.menu_name);
      return;
    }

    setCart((current) => {
      const existing = current[menuItem.id];

      return {
        ...current,
        [menuItem.id]: {
          menuItem,
          quantity: (existing?.quantity ?? 0) + 1,
        },
      };
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((current) => {
      const existing = current[menuItemId];

      if (!existing) return current;

      const nextQuantity = existing.quantity + delta;
      const next = { ...current };

      if (nextQuantity <= 0) {
        delete next[menuItemId];
      } else {
        next[menuItemId] = {
          ...existing,
          quantity: nextQuantity,
        };
      }

      return next;
    });
  }

  async function handleInstall() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function handleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch {
      toast.error(
        "Fullscreen unavailable",
        "Install the POS app for the cleanest fullscreen mode.",
      );
    }
  }

  async function handleOpenSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLocationId || !shiftName) {
      toast.error(
        "Shift incomplete",
        "Choose outlet location and shift.",
      );
      return;
    }

    setIsOpening(true);

    try {
      const opened = await posService.openSession({
        location_id: selectedLocationId,
        shift_name: shiftName,
        opening_cash: numberValue(openingCash),
      });

      setSession(opened);
      setActualCash(String(opened.calculated_expected_cash));
      toast.success("Shift opened", opened.session_no);
    } catch (error) {
      toast.error("Open shift failed", getApiErrorMessage(error));
    } finally {
      setIsOpening(false);
    }
  }

  async function handleCheckout() {
    if (!canCheckout) return;

    setIsPaying(true);

    try {
      const receiptItems = cartItems.map((item) => ({
        name: item.menuItem.menu_name,
        quantity: item.quantity,
        unit_price: numberValue(item.menuItem.price),
        subtotal: numberValue(item.menuItem.price) * item.quantity,
      }));
      const sale = await posService.createSale({
        items: cartItems.map((item) => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        paid_amount: paymentMethod === "NONCASH" ? subtotal : paid,
        reference_no:
          null,
      });

      setLastSale({
        sale_no: sale.sale_no,
        payment_method: sale.payment_method,
        paid_amount: sale.paid_amount,
        subtotal,
        change_amount: sale.change_amount,
        items: receiptItems,
      });
      setCart({});
      setPaidAmount("");
      toast.success("Payment confirmed", sale.sale_no);

      const active = await posService.getActiveSession();
      const menuItems = await posService.getMenu();
      setSession(active);
      setMenu(menuItems);
      setActualCash(
        active?.calculated_expected_cash
          ? String(active.calculated_expected_cash)
          : "",
      );
    } catch (error) {
      toast.error("Payment failed", getApiErrorMessage(error));
    } finally {
      setIsPaying(false);
    }
  }

  async function handleExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) return;

    if (
      !expenseCategory.trim() ||
      !expenseReason.trim() ||
      numberValue(expenseAmount) <= 0
    ) {
      toast.error(
        "Expense incomplete",
        "Category, amount greater than 0, and reason are required.",
      );
      return;
    }

    setIsRecordingExpense(true);

    try {
      await posService.createExpense({
        expense_category: expenseCategory.trim(),
        amount: numberValue(expenseAmount),
        reason: expenseReason.trim(),
      });

      setExpenseAmount("");
      setExpenseReason("");
      toast.success("Expense recorded");

      const active = await posService.getActiveSession();
      setSession(active);
      setActualCash(
        active?.calculated_expected_cash
          ? String(active.calculated_expected_cash)
          : "",
      );
    } catch (error) {
      toast.error("Expense failed", getApiErrorMessage(error));
    } finally {
      setIsRecordingExpense(false);
    }
  }

  async function handleDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) return;

    if (!depositReceiver.trim() || numberValue(depositAmount) <= 0) {
      toast.error(
        "Deposit incomplete",
        "Amount greater than 0 and receiver name are required.",
      );
      return;
    }

    setIsRecordingDeposit(true);

    try {
      await posService.createDeposit({
        amount: numberValue(depositAmount),
        received_by: depositReceiver.trim(),
        notes: depositNotes.trim() || null,
      });

      setDepositAmount("");
      setDepositReceiver("");
      setDepositNotes("");
      toast.success("Deposit recorded");

      const active = await posService.getActiveSession();
      setSession(active);
      setActualCash(
        active?.calculated_expected_cash
          ? String(active.calculated_expected_cash)
          : "",
      );
    } catch (error) {
      toast.error("Deposit failed", getApiErrorMessage(error));
    } finally {
      setIsRecordingDeposit(false);
    }
  }

  async function handleCloseSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) return;

    if (!actualCash.trim()) {
      toast.error(
        "Close shift incomplete",
        "Actual cash is required.",
      );
      return;
    }

    setIsClosing(true);

    try {
      const closed = await posService.closeSession(
        session.cashier_session_id,
        {
          actual_cash: numberValue(actualCash),
          notes: closeNotes.trim() || null,
        },
      );

      setSession(null);
      setCart({});
      setActualCash("");
      setCloseNotes("");
      setDrawerAction(null);
      setDrawerOpen(false);
      toast.success(
        "Shift closed",
        `Difference ${money(closed.cash_difference)}`,
      );
    } catch (error) {
      toast.error("Close shift failed", getApiErrorMessage(error));
    } finally {
      setIsClosing(false);
    }
  }

  async function handleLogout() {
    await logout();
    window.location.replace("/login");
  }

  function handlePrintReceipt() {
    if (!lastSale) return;

    const receiptWindow = window.open("", "_blank", "width=420,height=640");

    if (!receiptWindow) {
      toast.error(
        "Receipt blocked",
        "Allow pop-ups for this site, then print the receipt again.",
      );
      return;
    }

    const rows = lastSale.items
      .map(
        (item) => `
          <tr>
            <td>
              <strong>${escapeReceiptText(item.name)}</strong>
              <span>${item.quantity} x ${escapeReceiptText(
                money(item.unit_price),
              )}</span>
            </td>
            <td>${escapeReceiptText(money(item.subtotal))}</td>
          </tr>
        `,
      )
      .join("");

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeReceiptText(lastSale.sale_no)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              color: #0f172a;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
            }
            .receipt { max-width: 320px; margin: 0 auto; }
            h1 { margin: 0; font-size: 18px; text-align: center; }
            .muted { color: #64748b; font-size: 12px; text-align: center; }
            .meta { margin: 18px 0; border-top: 1px dashed #94a3b8; border-bottom: 1px dashed #94a3b8; padding: 12px 0; font-size: 12px; }
            .meta div, .total div { display: flex; justify-content: space-between; gap: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            td { padding: 8px 0; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
            td:last-child { text-align: right; white-space: nowrap; }
            td span { display: block; margin-top: 4px; color: #64748b; }
            .total { margin-top: 12px; font-size: 13px; font-weight: 700; }
            .thanks { margin-top: 18px; text-align: center; font-size: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <main class="receipt">
            <h1>Enterprise WMS POS</h1>
            <p class="muted">${escapeReceiptText(currentLocationName)}</p>
            <div class="meta">
              <div><span>Sale</span><strong>${escapeReceiptText(
                lastSale.sale_no,
              )}</strong></div>
              <div><span>Cashier</span><strong>${escapeReceiptText(
                cashierName,
              )}</strong></div>
              <div><span>Shift</span><strong>${escapeReceiptText(
                activeShiftName,
              )}</strong></div>
              <div><span>Payment</span><strong>${escapeReceiptText(
                lastSale.payment_method,
              )}</strong></div>
            </div>
            <table><tbody>${rows}</tbody></table>
            <div class="total">
              <div><span>Total</span><span>${escapeReceiptText(
                money(lastSale.subtotal),
              )}</span></div>
              <div><span>Paid</span><span>${escapeReceiptText(
                money(lastSale.paid_amount),
              )}</span></div>
              <div><span>Change</span><span>${escapeReceiptText(
                money(lastSale.change_amount),
              )}</span></div>
            </div>
            <p class="thanks">Thank you.</p>
          </main>
          <script>
            window.addEventListener("load", () => {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    receiptWindow.document.close();
  }

  if (isLoading) {
    return (
      <FeedbackPanel
        fullScreen
        title="Loading POS..."
        description="Preparing shift, outlet, and menu data."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#eff7f1] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-teal-100 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(true);
                setDrawerAction(null);
              }}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-100 bg-white text-slate-700 shadow-sm"
              aria-label="Open cashier menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-950">
                {currentLocationName}
              </p>
              <p className="flex min-w-0 items-center gap-2 truncate text-xs font-medium text-slate-500">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    session ? "bg-teal-500" : "bg-slate-300"
                  }`}
                />
                <span className="truncate">
                  Cashier - {cashierName}
                  {session ? `, ${activeShiftName}` : ", belum open shift"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {installPrompt ? (
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-sm font-semibold text-teal-800"
              >
                <Boxes size={16} />
                Install
              </button>
            ) : null}
            <button
              type="button"
              onClick={loadPosData}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-teal-100 bg-white text-slate-600 shadow-sm"
              aria-label="Refresh POS"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35"
            aria-label="Close cashier menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(92vw,380px)] flex-col border-r border-teal-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-teal-100 px-4 py-4">
              <div>
                <p className="text-base font-bold">Cashier Menu</p>
                <p className="text-xs font-medium text-slate-500">
                  {session ? session.session_no : "Open a shift first"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {session ? (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-teal-50 p-3">
                    <p className="text-xs font-semibold uppercase text-teal-700">
                      Cash
                    </p>
                    <p className="mt-1 text-base font-bold">
                      {money(session.calculated_expected_cash)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Sales
                    </p>
                    <p className="mt-1 text-base font-bold">
                      {session.total_sales_count}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                {canReceiveTransfers ? (
                  <Link
                    to="/dashboard/transfers"
                    onClick={() => setDrawerOpen(false)}
                    className="flex h-12 items-center gap-3 rounded-xl border border-teal-100 px-3 text-sm font-bold transition hover:bg-teal-50"
                  >
                    <ArrowLeftRight size={18} />
                    Barang Masuk
                  </Link>
                ) : null}
                <button
                  type="button"
                  disabled={!session}
                  onClick={() => setDrawerAction("expense")}
                  className="flex h-12 items-center gap-3 rounded-xl border border-teal-100 px-3 text-sm font-bold transition hover:bg-teal-50 disabled:opacity-50"
                >
                  <WalletCards size={18} />
                  Expense
                </button>
                <button
                  type="button"
                  disabled={!session}
                  onClick={() => setDrawerAction("deposit")}
                  className="flex h-12 items-center gap-3 rounded-xl border border-teal-100 px-3 text-sm font-bold transition hover:bg-teal-50 disabled:opacity-50"
                >
                  <Banknote size={18} />
                  Setor Kas
                </button>
                <button
                  type="button"
                  disabled={!session}
                  onClick={() => setDrawerAction("close")}
                  className="flex h-12 items-center gap-3 rounded-xl border border-rose-200 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <Power size={18} />
                  Close Shift
                </button>
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="flex h-12 items-center gap-3 rounded-xl border border-teal-100 px-3 text-sm font-bold transition hover:bg-teal-50"
                >
                  <Maximize2 size={18} />
                  Fullscreen
                </button>
                {installPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstall}
                    className="flex h-12 items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-3 text-sm font-bold text-teal-800"
                  >
                    <Boxes size={18} />
                    Install App
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex h-12 items-center gap-3 rounded-xl border border-teal-100 px-3 text-sm font-bold transition hover:bg-teal-50"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>

              {drawerAction === "expense" ? (
                <form
                  onSubmit={handleExpense}
                  className="mt-5 space-y-3 rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-sm font-bold">Expense</p>
                  <input
                    value={expenseCategory}
                    onChange={(event) =>
                      setExpenseCategory(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                    placeholder="Category"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    value={expenseAmount}
                    onChange={(event) =>
                      setExpenseAmount(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                    placeholder="Amount"
                    required
                  />
                  <input
                    value={expenseReason}
                    onChange={(event) =>
                      setExpenseReason(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                    placeholder="Reason"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isRecordingExpense}
                    className="h-10 w-full"
                  >
                    {isRecordingExpense ? "Saving..." : "Save Expense"}
                  </Button>
                </form>
              ) : null}

              {drawerAction === "deposit" ? (
                <form
                  onSubmit={handleDeposit}
                  className="mt-5 space-y-3 rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-sm font-bold">Setor Kas</p>
                  <input
                    type="number"
                    min="1"
                    value={depositAmount}
                    onChange={(event) =>
                      setDepositAmount(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                    placeholder="Amount"
                    required
                  />
                  <input
                    value={depositReceiver}
                    onChange={(event) =>
                      setDepositReceiver(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                    placeholder="Received by"
                    required
                  />
                  <input
                    value={depositNotes}
                    onChange={(event) =>
                      setDepositNotes(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                    placeholder="Notes"
                  />
                  <Button
                    type="submit"
                    disabled={isRecordingDeposit}
                    className="h-10 w-full"
                  >
                    {isRecordingDeposit ? "Saving..." : "Save Deposit"}
                  </Button>
                </form>
              ) : null}

              {drawerAction === "close" ? (
                <form
                  onSubmit={handleCloseSession}
                  className="mt-5 space-y-3 rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-sm font-bold">Close Shift</p>
                  <input
                    type="number"
                    min="0"
                    value={actualCash}
                    onChange={(event) =>
                      setActualCash(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                    placeholder="Actual cash"
                    required
                  />
                  <input
                    value={closeNotes}
                    onChange={(event) =>
                      setCloseNotes(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"
                    placeholder="Notes"
                  />
                  <button
                    type="submit"
                    disabled={isClosing}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white text-sm font-bold text-rose-700"
                  >
                    <Power size={16} />
                    {isClosing ? "Closing..." : "Close Shift"}
                  </button>
                </form>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {!session ? (
        <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-xl shadow-teal-900/5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                <Power size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Open Shift</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Choose outlet and starting cash before selling.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleOpenSession}
              className="mt-6 grid gap-4 md:grid-cols-2"
            >
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">
                  Work Location
                </span>
                <select
                  value={selectedLocationId}
                  onChange={(event) =>
                    setSelectedLocationId(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-teal-100 bg-white px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  required
                >
                  <option value="">Select outlet</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.location_code} - {location.location_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Shift
                </span>
                <select
                  value={shiftName}
                  onChange={(event) =>
                    setShiftName(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-teal-100 bg-white px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  required
                >
                  <option value="">Select shift</option>
                  {shiftOptions.map((shift) => (
                    <option key={shift} value={shift}>
                      {shift}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Opening Cash
                </span>
                <input
                  type="number"
                  min="0"
                  value={openingCash}
                  onChange={(event) =>
                    setOpeningCash(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-teal-100 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  required
                />
              </label>

              <Button
                type="submit"
                disabled={isOpening || locations.length === 0}
                className="h-11 md:col-span-2"
              >
                {isOpening ? "Opening..." : "Start Selling"}
              </Button>
            </form>
          </section>

          <aside className="rounded-2xl border border-teal-100 bg-white/90 p-5 shadow-xl shadow-teal-900/5">
            <h2 className="text-base font-bold text-slate-950">
              Outlet Checklist
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="flex items-center gap-2">
                <Check size={16} />
                POS menu visible and available
              </p>
              <p className="flex items-center gap-2">
                <Check size={16} />
                Location type is OUTLET
              </p>
              <p className="flex items-center gap-2">
                <Check size={16} />
                Cash drawer counted
              </p>
            </div>
          </aside>
        </main>
      ) : (
        <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_390px]">
          <section className="min-w-0 space-y-4">
            <div className="space-y-3 rounded-2xl border border-teal-100 bg-white/70 p-3 shadow-sm backdrop-blur">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search menu"
                  className="h-11 w-full rounded-xl border border-teal-100 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(value)}
                    className={`h-10 whitespace-nowrap rounded-xl px-3 text-sm font-bold transition ${
                      category === value
                        ? "bg-teal-700 text-white shadow-sm"
                        : "border border-teal-100 bg-white text-slate-700 hover:bg-teal-50"
                    }`}
                  >
                    {value === "ALL" ? "All" : value}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredMenu.map((item) => {
                const quantity = cart[item.id]?.quantity ?? 0;
                const availableStock = stockValue(item);
                const isOutOfStock =
                  availableStock !== null && availableStock <= 0;
                const isAtStockLimit =
                  availableStock !== null && quantity >= availableStock;

                return (
                  <div
                    key={item.id}
                    className="min-h-[150px] rounded-2xl border border-teal-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="inline-flex rounded-md bg-teal-50 px-2 py-1 text-[11px] font-bold uppercase text-teal-700">
                          {normalizeCategory(item.category)}
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-base font-bold">
                          {item.menu_name}
                        </h3>
                        <p
                          className={`mt-2 text-xs font-semibold ${
                            isOutOfStock
                              ? "text-rose-600"
                              : item.is_low_stock
                                ? "text-amber-600"
                                : "text-slate-500"
                          }`}
                        >
                          {availableStock === null
                            ? "Stock ready"
                            : `Stock ${availableStock}`}
                        </p>
                      </div>
                      <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={quantity === 0}
                          className="flex h-9 w-9 items-center justify-center text-slate-700 disabled:text-slate-300"
                          aria-label={`Decrease ${item.menu_name}`}
                        >
                          <Minus size={15} />
                        </button>
                        <span className="w-9 text-center text-sm font-bold">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          disabled={isOutOfStock || isAtStockLimit}
                          className="flex h-9 w-9 items-center justify-center rounded-r-lg bg-teal-700 text-white disabled:bg-slate-100 disabled:text-slate-300"
                          aria-label={`Increase ${item.menu_name}`}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-4 text-xl font-extrabold text-slate-950">
                      {money(item.price)}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {isOutOfStock ? "Unavailable" : item.menu_code}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="lg:sticky lg:top-[68px] lg:h-[calc(100vh-84px)]">
            <div className="flex h-full flex-col rounded-2xl border border-teal-100 bg-white shadow-xl shadow-teal-900/5">
              <div className="border-b border-teal-100 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <ShoppingCart size={20} />
                    Cart
                  </h2>
                  {cartItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setCart({})}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-600"
                      aria-label="Clear cart"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {cartItems.length === 0 ? (
                  <div className="flex h-44 items-center justify-center rounded-2xl bg-slate-50 text-center text-sm font-medium text-slate-500">
                    No items selected.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.menuItem.id}
                        className="rounded-2xl border border-teal-100 p-3"
                      >
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {item.menuItem.menu_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {money(item.menuItem.price)}
                            </p>
                          </div>
                          <p className="text-sm font-bold">
                            {money(
                              numberValue(item.menuItem.price) *
                                item.quantity,
                            )}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-xl border border-teal-100">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.menuItem.id, -1)
                              }
                              className="flex h-9 w-9 items-center justify-center"
                              aria-label={`Decrease ${item.menuItem.menu_name}`}
                            >
                              <Minus size={15} />
                            </button>
                            <span className="w-10 text-center text-sm font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.menuItem.id, 1)
                              }
                              className="flex h-9 w-9 items-center justify-center"
                              aria-label={`Increase ${item.menuItem.menu_name}`}
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t border-teal-100 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-500">
                    Total
                  </span>
                  <span className="text-2xl font-extrabold">
                    {money(subtotal)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold ${
                      paymentMethod === "CASH"
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Banknote size={17} />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("NONCASH")}
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold ${
                      paymentMethod === "NONCASH"
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <CreditCard size={17} />
                    Noncash
                  </button>
                </div>

                {paymentMethod === "CASH" ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Cash Received
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(event) =>
                        setPaidAmount(event.target.value)
                      }
                      placeholder={String(subtotal)}
                      className="h-11 w-full rounded-xl border border-teal-100 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                    />
                    <span className="block text-sm font-semibold text-teal-700">
                      Change {money(changeAmount)}
                    </span>
                  </label>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                    Noncash payment selected.
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleCheckout}
                  disabled={!canCheckout}
                  className="h-12 w-full rounded-xl"
                >
                  {isPaying ? "Processing..." : "Confirm Payment"}
                </Button>

                {lastSale ? (
                  <div className="space-y-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{lastSale.sale_no}</p>
                        <p className="text-xs font-semibold">
                          {lastSale.payment_method} paid and recorded
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLastSale(null)}
                        className="text-xs font-bold text-emerald-800"
                      >
                        Close
                      </button>
                    </div>
                    <div className="space-y-1">
                      {lastSale.items.map((item) => (
                        <div
                          key={`${lastSale.sale_no}-${item.name}`}
                          className="flex justify-between gap-3"
                        >
                          <span>
                            {item.name} x{item.quantity}
                          </span>
                          <span className="font-semibold">
                            {money(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-emerald-200 pt-2 font-bold">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span>{money(lastSale.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid</span>
                        <span>{money(lastSale.paid_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change</span>
                        <span>{money(lastSale.change_amount)}</span>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handlePrintReceipt}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white text-sm font-bold text-teal-800 transition hover:bg-teal-100"
                      >
                        <Printer size={16} />
                        Print receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setLastSale(null)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-bold text-white transition hover:bg-teal-800"
                      >
                        <Check size={16} />
                        Skip receipt
                      </button>
                    </div>
                  </div>
                ) : null}

              </div>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
