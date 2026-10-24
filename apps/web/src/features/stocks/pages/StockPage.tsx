import {
  ArrowDown,
  ArrowUp,
  Boxes,
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { masterDataService } from "@/features/transfers/services/master-data.service";
import type {
  ItemOption,
  LocationOption,
} from "@/features/transfers/types/transfer.types";
import { getApiErrorMessage } from "@/shared/lib/api/error";
import { Button } from "@/shared/ui/button/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/input";
import { Select } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";

import { stockService } from "../services/stock.service";
import type {
  CurrentStock,
  Pagination,
  StockLedger,
} from "../types/stock.types";

type ViewMode = "current" | "ledger";
type MovementMode = "initial" | "adjustment";
const LOW_STOCK_THRESHOLD = 5;

const emptyPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);
}

function itemLabel(item: ItemOption) {
  return `${item.item_code} - ${item.item_name}`;
}

function locationLabel(location: LocationOption) {
  return `${location.code} - ${location.name}`;
}

function movementTone(movementType: string) {
  if (movementType === "IN") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (movementType === "OUT") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

export function StockPage() {
  const [view, setView] = useState<ViewMode>("current");
  const [currentStocks, setCurrentStocks] = useState<
    CurrentStock[]
  >([]);
  const [ledgers, setLedgers] = useState<StockLedger[]>([]);
  const [pagination, setPagination] =
    useState<Pagination>(emptyPagination);

  const [items, setItems] = useState<ItemOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [itemFilter, setItemFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [appliedItemFilter, setAppliedItemFilter] = useState("");
  const [
    appliedLocationFilter,
    setAppliedLocationFilter,
  ] = useState("");
  const [page, setPage] = useState(1);

  const [movementMode, setMovementMode] =
    useState<MovementMode>("initial");
  const [movementItemId, setMovementItemId] = useState("");
  const [movementLocationId, setMovementLocationId] =
    useState("");
  const [quantity, setQuantity] = useState(1);
  const [stockEffect, setStockEffect] =
    useState<"PLUS" | "MINUS">("PLUS");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoadingMaster(true);

        const [itemResult, locationResult] =
          await Promise.all([
            masterDataService.getItems(),
            masterDataService.getLocations(),
          ]);

        setItems(itemResult);
        setLocations(locationResult);
        setMovementItemId(itemResult[0]?.id || "");
        setMovementLocationId(locationResult[0]?.id || "");
      } catch (error) {
        toast.error(
          "Failed to load master data",
          getApiErrorMessage(error),
        );
      } finally {
        setLoadingMaster(false);
      }
    }

    loadMasterData();
  }, []);

  const loadStocks = useCallback(async () => {
    try {
      setLoadingStocks(true);

      const query = {
        page,
        limit: 20,
        item_id: appliedItemFilter || undefined,
        location_id: appliedLocationFilter || undefined,
      };

      if (view === "current") {
        const result =
          await stockService.getCurrentStocks(query);

        setCurrentStocks(result.data);
        setPagination(result.pagination);
      } else {
        const result = await stockService.getLedgers(query);

        setLedgers(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      toast.error(
        "Failed to load stock data",
        getApiErrorMessage(error),
      );
    } finally {
      setLoadingStocks(false);
    }
  }, [
    appliedItemFilter,
    appliedLocationFilter,
    page,
    view,
  ]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const totalQuantity = useMemo(
    () =>
      currentStocks.reduce(
        (total, stock) =>
          total + (Number(stock.quantity) || 0),
        0,
      ),
    [currentStocks],
  );

  const zeroStockCount = useMemo(
    () =>
      currentStocks.filter(
        (stock) => (Number(stock.quantity) || 0) <= 0,
      ).length,
    [currentStocks],
  );

  const lowStockCount = useMemo(
    () =>
      currentStocks.filter((stock) => {
        const quantity = Number(stock.quantity) || 0;

        return quantity > 0 && quantity <= LOW_STOCK_THRESHOLD;
      }).length,
    [currentStocks],
  );

    const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  function getUnitLabel(
    itemId: string,
    stockItem?: CurrentStock["items"] | StockLedger["items"],
  ) {
    const masterItem = itemsById.get(itemId);

    return (
      masterItem?.unit_code ||
      masterItem?.unit_name ||
      stockItem?.unit_code ||
      stockItem?.unit_name ||
      stockItem?.unit?.code ||
      stockItem?.unit?.name ||
      ""
    );
  }

  function formatQuantityWithUnit(
    quantity: number,
    itemId: string,
    stockItem?: CurrentStock["items"] | StockLedger["items"],
  ) {
    const unit = getUnitLabel(itemId, stockItem);

    return unit
      ? `${formatQuantity(quantity)} ${unit}`
      : formatQuantity(quantity);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedItemFilter(itemFilter);
    setAppliedLocationFilter(locationFilter);
  }

  function resetFilters() {
    setItemFilter("");
    setLocationFilter("");
    setAppliedItemFilter("");
    setAppliedLocationFilter("");
    setPage(1);
  }

  function changeView(nextView: ViewMode) {
    setView(nextView);
    setPage(1);
    setPagination(emptyPagination);
  }

  async function handleMovementSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !movementItemId ||
      !movementLocationId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      toast.error(
        "Invalid stock movement",
        "Item, location, and a positive quantity are required.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const basePayload = {
        item_id: movementItemId,
        location_id: movementLocationId,
        quantity: Number(quantity),
        remarks: remarks.trim() || undefined,
      };

      if (movementMode === "initial") {
        await stockService.createInitialStock(basePayload);
      } else {
        await stockService.createAdjustment({
          ...basePayload,
          stock_effect: stockEffect,
        });
      }

      toast.success(
        "Stock updated",
        movementMode === "initial"
          ? "Initial stock was created successfully."
          : "Stock adjustment was created successfully.",
      );

      setRemarks("");
      setQuantity(1);
      await loadStocks();
    } catch (error) {
      toast.error(
        "Failed to update stock",
        getApiErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const rowsAreEmpty =
    view === "current"
      ? currentStocks.length === 0
      : ledgers.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Stock Control
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor balances, review movements, and record stock
            changes.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={loadingStocks}
          onClick={loadStocks}
        >
          <RefreshCw
            size={16}
            className={loadingStocks ? "animate-spin" : ""}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">
              Balance Records
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {pagination.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">
              Page Quantity
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {view === "current"
                ? formatQuantity(totalQuantity)
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">
              Empty Stock
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {view === "current" ? zeroStockCount : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">
              Low Stock
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {view === "current" ? lowStockCount : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={
                    view === "current" ? "default" : "outline"
                  }
                  onClick={() => changeView("current")}
                >
                  <Boxes size={16} />
                  Current Stock
                </Button>

                <Button
                  type="button"
                  variant={
                    view === "ledger" ? "default" : "outline"
                  }
                  onClick={() => changeView("ledger")}
                >
                  <History size={16} />
                  Movement Ledger
                </Button>
              </div>

              <form
                onSubmit={applyFilters}
                className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"
              >
                <Select
                  value={itemFilter}
                  disabled={loadingMaster}
                  onChange={(event) =>
                    setItemFilter(event.target.value)
                  }
                >
                  <option value="">All items</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {itemLabel(item)}
                    </option>
                  ))}
                </Select>

                <Select
                  value={locationFilter}
                  disabled={loadingMaster}
                  onChange={(event) =>
                    setLocationFilter(event.target.value)
                  }
                >
                  <option value="">All locations</option>
                  {locations.map((location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {locationLabel(location)}
                    </option>
                  ))}
                </Select>

                <Button type="submit">
                  <SlidersHorizontal size={16} />
                  Filter
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {view === "current"
                  ? "Current Stock"
                  : "Movement Ledger"}
              </CardTitle>
              <CardDescription>
                {pagination.total} record
                {pagination.total === 1 ? "" : "s"} found.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">
                        Item
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Location
                      </th>
                      {view === "ledger" ? (
                        <th className="px-5 py-3 font-semibold">
                          Movement
                        </th>
                      ) : null}
                      <th className="px-5 py-3 text-right font-semibold">
                        Quantity
                      </th>
                      {view === "ledger" ? (
                        <th className="px-5 py-3 font-semibold">
                          Reference
                        </th>
                      ) : null}
                      <th className="px-5 py-3 font-semibold">
                        Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loadingStocks ? (
                      <tr>
                        <td
                          colSpan={view === "current" ? 4 : 6}
                          className="px-5 py-12 text-center text-sm text-slate-500"
                        >
                          Loading stock data...
                        </td>
                      </tr>
                    ) : rowsAreEmpty ? (
                      <tr>
                        <td
                          colSpan={view === "current" ? 4 : 6}
                          className="px-5 py-12 text-center"
                        >
                          <p className="font-semibold text-slate-900">
                            No stock data found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Adjust the filters or record an initial stock.
                          </p>
                        </td>
                      </tr>
                    ) : view === "current" ? (
                      currentStocks.map((stock, index) => (
                          <tr
                            key={
                              stock.id ||
                              `${stock.item_id}-${stock.location_id}-${index}`
                            }
                            className="bg-white transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {stock.items?.item_code || "-"}
                              </p>
                              <p className="text-slate-500">
                                {stock.items?.item_name ||
                                  stock.item_id}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {stock.locations?.code || "-"}
                              </p>
                              <p className="text-slate-500">
                                {stock.locations?.name ||
                                  stock.location_id}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <p className="text-base font-bold text-slate-950">
                                {formatQuantityWithUnit(
                                  stock.quantity,
                                  stock.item_id,
                                  stock.items,
                                )}
                              </p>
                              {(Number(stock.quantity) || 0) <= 0 ? (
                                <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                                  Empty
                                </span>
                              ) : (Number(stock.quantity) || 0) <=
                                LOW_STOCK_THRESHOLD ? (
                                <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                                  Low stock
                                </span>
                              ) : null}
                            </td>
                            <td className="px-5 py-4 text-slate-500">
                              {formatDate(stock.updated_at)}
                            </td>
                          </tr>
                        ))
                    ) : (
                      ledgers.map((ledger) => (
                          <tr
                            key={ledger.id}
                            className="bg-white transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {ledger.items?.item_code || "-"}
                              </p>
                              <p className="text-slate-500">
                                {ledger.items?.item_name ||
                                  ledger.item_id}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {ledger.locations?.code || "-"}
                              </p>
                              <p className="text-slate-500">
                                {ledger.locations?.name ||
                                  ledger.location_id}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${movementTone(
                                  ledger.movement_type,
                                )}`}
                              >
                                {ledger.movement_type}
                                {ledger.stock_effect
                                  ? ` ${ledger.stock_effect}`
                                  : ""}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right text-base font-bold text-slate-950">
                              {formatQuantityWithUnit(
                                ledger.quantity,
                                ledger.item_id,
                                ledger.items,
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-700">
                                {ledger.reference_type || "-"}
                              </p>
                              <p className="text-slate-500">
                                {ledger.reference_no ||
                                  ledger.remarks ||
                                  "-"}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-slate-500">
                              {formatDate(ledger.created_at)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">
                  Page {pagination.page} of{" "}
                  {Math.max(pagination.totalPages, 1)}
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-10 px-0"
                    disabled={page <= 1 || loadingStocks}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-10 px-0"
                    disabled={
                      page >= pagination.totalPages ||
                      loadingStocks
                    }
                    onClick={() =>
                      setPage((current) => current + 1)
                    }
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Record Movement</CardTitle>
            <CardDescription>
              Create initial stock or an audited adjustment.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={
                  movementMode === "initial"
                    ? "default"
                    : "outline"
                }
                onClick={() => setMovementMode("initial")}
              >
                <ArrowUp size={16} />
                Initial
              </Button>

              <Button
                type="button"
                variant={
                  movementMode === "adjustment"
                    ? "default"
                    : "outline"
                }
                onClick={() => setMovementMode("adjustment")}
              >
                <SlidersHorizontal size={16} />
                Adjustment
              </Button>
            </div>

            <form
              onSubmit={handleMovementSubmit}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Item
                </label>
                <Select
                  value={movementItemId}
                  disabled={loadingMaster || submitting}
                  onChange={(event) =>
                    setMovementItemId(event.target.value)
                  }
                >
                  <option value="">Select item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {itemLabel(item)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <Select
                  value={movementLocationId}
                  disabled={loadingMaster || submitting}
                  onChange={(event) =>
                    setMovementLocationId(event.target.value)
                  }
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {locationLabel(location)}
                    </option>
                  ))}
                </Select>
              </div>

              {movementMode === "adjustment" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Stock Effect
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={
                        stockEffect === "PLUS"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setStockEffect("PLUS")}
                    >
                      <ArrowUp size={16} />
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant={
                        stockEffect === "MINUS"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setStockEffect("MINUS")}
                    >
                      <ArrowDown size={16} />
                      Reduce
                    </Button>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Quantity
                </label>
                <Input
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={quantity}
                  disabled={submitting}
                  onChange={(event) =>
                    setQuantity(Number(event.target.value))
                  }
                />
              </div>

              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Unit: {getUnitLabel(movementItemId) || "-"}
              </p>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Remarks
                </label>
                <Textarea
                  value={remarks}
                  maxLength={1000}
                  disabled={submitting}
                  placeholder="Reason or supporting note"
                  onChange={(event) =>
                    setRemarks(event.target.value)
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  submitting ||
                  loadingMaster ||
                  !movementItemId ||
                  !movementLocationId
                }
              >
                {submitting
                  ? "Saving..."
                  : movementMode === "initial"
                    ? "Create Initial Stock"
                    : "Create Adjustment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
