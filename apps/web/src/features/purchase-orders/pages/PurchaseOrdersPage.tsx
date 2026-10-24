import {
  Ban,
  Check,
  AlertTriangle,
  PackagePlus,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { masterDataService } from "@/features/transfers/services/master-data.service";
import {
  masterDataPageService,
  VendorRow,
} from "@/features/master-data/services/master-data-page.service";
import type {
  ItemOption,
  LocationOption,
} from "@/features/transfers/types/transfer.types";
import {
  PERMISSIONS,
  hasPermission,
} from "@/shared/auth/permissions";
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
import { useAuthStore } from "@/stores/auth.store";

import {
  PurchaseOrder,
  PurchaseOrderImportRow,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  LowStockCandidate,
  purchaseOrderService,
} from "../services/purchase-order.service";

type DraftItem = {
  item_id: string;
  qty_ordered: number;
  unit_price: number;
  notes: string;
};

type ReceiveDraftItem = {
  purchase_order_item_id: string;
  item_name: string;
  remaining_qty: number;
  qty_received: number;
  unit_price: number;
  notes: string;
};

const statusOptions: Array<PurchaseOrderStatus | ""> = [
  "",
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

const emptyPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function statusTone(status: PurchaseOrderStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "ORDERED":
      return "bg-sky-50 text-sky-700";
    case "PARTIALLY_RECEIVED":
      return "bg-amber-50 text-amber-700";
    case "RECEIVED":
      return "bg-emerald-50 text-emerald-700";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function itemLabel(item: ItemOption) {
  return `${item.item_code} - ${item.item_name}`;
}

function locationLabel(location: LocationOption) {
  return `${location.code} - ${location.name}`;
}

function getPoItems(po: PurchaseOrder) {
  return po.items ?? po.purchase_order_items ?? [];
}

function getItemName(item: PurchaseOrderItem) {
  return (
    item.item_name ||
    item.name ||
    item.item_code ||
    item.item_id ||
    "Item"
  );
}

export function PurchaseOrdersPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canWrite = hasPermission(
    role,
    PERMISSIONS.PURCHASE_ORDERS_WRITE,
  );
  const canReceive = hasPermission(
    role,
    PERMISSIONS.PURCHASE_ORDERS_RECEIVE,
  );

  const [purchaseOrders, setPurchaseOrders] = useState<
    PurchaseOrder[]
  >([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] =
    useState<PurchaseOrderStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [items, setItems] = useState<ItemOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(today());
  const [expectedDate, setExpectedDate] = useState("");
  const [destinationLocationId, setDestinationLocationId] =
    useState("");
  const [remarks, setRemarks] = useState("");
  const [sourceType, setSourceType] =
    useState<"MANUAL" | "SPREADSHEET" | "AI_PHOTO">("MANUAL");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([
    {
      item_id: "",
      qty_ordered: 1,
      unit_price: 0,
      notes: "",
    },
  ]);
  const [rawImport, setRawImport] = useState("");
  const [importRows, setImportRows] = useState<
    PurchaseOrderImportRow[]
  >([]);
  const [parsingImport, setParsingImport] = useState(false);

  const [receivingPo, setReceivingPo] =
    useState<PurchaseOrder | null>(null);
  const [receiveItems, setReceiveItems] = useState<
    ReceiveDraftItem[]
  >([]);
  const [receiveRemarks, setReceiveRemarks] = useState("");

  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [lowStockLocationId, setLowStockLocationId] =
    useState("");
  const [lowStockRows, setLowStockRows] = useState<
    LowStockCandidate[]
  >([]);
  const [loadingLowStock, setLoadingLowStock] = useState(false);
  const [lowStockVendor, setLowStockVendor] = useState("");
  const [lowStockVendorId, setLowStockVendorId] = useState("");
  const [lowStockNotes, setLowStockNotes] = useState("");
  const [detailPo, setDetailPo] = useState<PurchaseOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoadingMaster(true);
        const [itemResult, locationResult, vendorResult] =
          await Promise.all([
            masterDataService.getItems(),
            masterDataService.getLocations(),
            masterDataPageService.getVendors({
              limit: 200,
            }),
          ]);

        setItems(itemResult);
        setLocations(locationResult);
        setVendors(vendorResult.filter((vendor) => vendor.is_active ?? true));
        setDestinationLocationId(locationResult[0]?.id || "");
        setLowStockLocationId(locationResult[0]?.id || "");
        setDraftItems((current) =>
          current.map((item, index) =>
            index === 0 && !item.item_id
              ? {
                  ...item,
                  item_id: itemResult[0]?.id || "",
                }
              : item,
          ),
        );
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

  const loadPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true);
      const result =
        await purchaseOrderService.getPurchaseOrders({
          page,
          limit: 20,
          search: appliedSearch,
          status,
        });

      setPurchaseOrders(result.data);
      setPagination(result.pagination);
    } catch (error) {
      toast.error(
        "Failed to load purchase orders",
        getApiErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, status]);

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const poStats = useMemo(() => {
    return purchaseOrders.reduce(
      (acc, po) => {
        acc.total += 1;
        if (po.status === "ORDERED") acc.ordered += 1;
        if (po.status === "PARTIALLY_RECEIVED") acc.partial += 1;
        if (po.status === "RECEIVED") acc.received += 1;
        return acc;
      },
      {
        total: 0,
        ordered: 0,
        partial: 0,
        received: 0,
      },
    );
  }, [purchaseOrders]);

  function resetCreateForm() {
    setVendorName("");
    setVendorId("");
    setOrderDate(today());
    setExpectedDate("");
    setDestinationLocationId(locations[0]?.id || "");
    setRemarks("");
    setSourceType("MANUAL");
    setDraftItems([
      {
        item_id: items[0]?.id || "",
        qty_ordered: 1,
        unit_price: 0,
        notes: "",
      },
    ]);
    setRawImport("");
    setImportRows([]);
  }

  function updateDraftItem(
    index: number,
    patch: Partial<DraftItem>,
  ) {
    setDraftItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function removeDraftItem(index: number) {
    setDraftItems((current) =>
      current.length === 1
        ? current
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function addDraftItem() {
    setDraftItems((current) => [
      ...current,
      {
        item_id: items[0]?.id || "",
        qty_ordered: 1,
        unit_price: 0,
        notes: "",
      },
    ]);
  }

  async function handleParseImport() {
    if (!rawImport.trim()) {
      toast.error(
        "Import text required",
        "Paste spreadsheet or OCR text first.",
      );
      return;
    }

    setParsingImport(true);

    try {
      const result = await purchaseOrderService.parseImport(rawImport);
      setImportRows(result.rows);

      const matchedRows = result.rows.filter(
        (row) => row.matched && row.item_id,
      );

      if (matchedRows.length > 0) {
        setDraftItems(
          matchedRows.map((row) => ({
            item_id: row.item_id || "",
            qty_ordered: row.qty_ordered,
            unit_price: row.unit_price,
            notes: row.notes || "",
          })),
        );
      }

      toast.success(
        "Import parsed",
        `${result.matched_count} matched, ${result.error_count} need review.`,
      );
    } catch (error) {
      toast.error("Import parse failed", getApiErrorMessage(error));
    } finally {
      setParsingImport(false);
    }
  }

  async function handleCreatePo(event: FormEvent) {
    event.preventDefault();

    if (!vendorName.trim()) {
      toast.error("Vendor is required");
      return;
    }

    if (!orderDate) {
      toast.error("Order date is required");
      return;
    }

    if (!destinationLocationId) {
      toast.error("Destination location is required");
      return;
    }

    const validItems = draftItems.filter(
      (item) => item.item_id && Number(item.qty_ordered) > 0,
    );

    if (validItems.length === 0) {
      toast.error(
        "PO items are required",
        "Add at least one item with quantity greater than 0.",
      );
      return;
    }

    const uniqueItems = new Set(validItems.map((item) => item.item_id));
    if (uniqueItems.size !== validItems.length) {
      toast.error(
        "Duplicate item",
        "Use one row per item in a purchase order.",
      );
      return;
    }

    setSubmitting(true);

    try {
      await purchaseOrderService.createPurchaseOrder({
        vendor_name: vendorName.trim(),
        vendor_id: vendorId || null,
        order_date: orderDate,
        expected_date: expectedDate || null,
        destination_location_id: destinationLocationId,
        source_type: sourceType,
        source_payload:
          rawImport.trim() || importRows.length
            ? {
                raw_text: rawImport.trim() || null,
                parsed_rows: importRows,
              }
            : null,
        notes: remarks.trim() || null,
        items: validItems.map((item) => ({
          item_id: item.item_id,
          qty_ordered: Number(item.qty_ordered),
          unit_price: Number(item.unit_price) || 0,
          notes: item.notes.trim() || null,
        })),
      });

      toast.success("Purchase order created");
      setCreateOpen(false);
      resetCreateForm();
      setPage(1);
      await loadPurchaseOrders();
    } catch (error) {
      toast.error(
        "Failed to create purchase order",
        getApiErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOrder(po: PurchaseOrder) {
    setSubmitting(true);

    try {
      await purchaseOrderService.orderPurchaseOrder(po.id);
      toast.success("Purchase order ordered");
      await loadPurchaseOrders();
    } catch (error) {
      toast.error("Failed to order PO", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(po: PurchaseOrder) {
    setSubmitting(true);

    try {
      await purchaseOrderService.cancelPurchaseOrder(
        po.id,
        "Cancelled from dashboard",
      );
      toast.success("Purchase order cancelled");
      await loadPurchaseOrders();
    } catch (error) {
      toast.error("Failed to cancel PO", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function openReceiveModal(po: PurchaseOrder) {
    const rows = getPoItems(po)
      .map((item) => {
        const ordered = Number(item.qty_ordered) || 0;
        const received = Number(item.qty_received) || 0;
        const remaining = Math.max(ordered - received, 0);

        return {
          purchase_order_item_id: item.id || "",
          item_name: getItemName(item),
          remaining_qty: remaining,
          qty_received: remaining,
          unit_price: Number(item.unit_price) || 0,
          notes: "",
        };
      })
      .filter(
        (item) =>
          item.purchase_order_item_id && item.remaining_qty > 0,
      );

    if (rows.length === 0) {
      toast.info("Nothing to receive", "All PO items are received.");
      return;
    }

    setReceivingPo(po);
    setReceiveItems(rows);
    setReceiveRemarks("");
  }

  function updateReceiveItem(
    index: number,
    patch: Partial<ReceiveDraftItem>,
  ) {
    setReceiveItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  async function handleReceive(event: FormEvent) {
    event.preventDefault();

    if (!receivingPo) return;

    const validItems = receiveItems.filter(
      (item) => Number(item.qty_received) > 0,
    );

    if (validItems.length === 0) {
      toast.error(
        "Receive quantity required",
        "Fill at least one received quantity greater than 0.",
      );
      return;
    }

    const overQty = validItems.find(
      (item) => item.qty_received > item.remaining_qty,
    );

    if (overQty) {
      toast.error(
        "Quantity exceeds PO",
        `${overQty.item_name} exceeds remaining quantity.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      await purchaseOrderService.receivePurchaseOrder(receivingPo.id, {
        receipt_date: today(),
        remarks: receiveRemarks.trim() || null,
        items: validItems.map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          qty_received: Number(item.qty_received),
          unit_price: Number(item.unit_price) || 0,
          notes: item.notes.trim() || null,
        })),
      });

      toast.success("Purchase order received");
      setReceivingPo(null);
      setReceiveItems([]);
      await loadPurchaseOrders();
    } catch (error) {
      toast.error("Failed to receive PO", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function loadLowStockCandidates(locationId = lowStockLocationId) {
    if (!locationId) {
      toast.error("Location is required");
      return;
    }

    setLoadingLowStock(true);

    try {
      const rows =
        await purchaseOrderService.getLowStockCandidates(locationId);
      setLowStockRows(rows);

      if (!lowStockVendor.trim()) {
        const defaultVendor = rows.find((row) =>
          row.default_vendor_name?.trim(),
        )?.default_vendor_name;

        setLowStockVendor(defaultVendor || "");
        setLowStockVendorId(
          vendors.find((vendor) => vendor.vendor_name === defaultVendor)
            ?.id || "",
        );
      }
    } catch (error) {
      toast.error(
        "Failed to load low stock",
        getApiErrorMessage(error),
      );
    } finally {
      setLoadingLowStock(false);
    }
  }

  async function openLowStockModal() {
    setLowStockOpen(true);
    setLowStockRows([]);
    setLowStockNotes(
      "Auto-generated from low stock reorder recommendation",
    );
    window.setTimeout(() => {
      loadLowStockCandidates(lowStockLocationId);
    }, 0);
  }

  async function handleGenerateLowStockPo() {
    if (!lowStockLocationId) {
      toast.error("Location is required");
      return;
    }

    if (lowStockRows.length === 0) {
      toast.error(
        "No reorder candidates",
        "All low-stock items may already be covered by open PO.",
      );
      return;
    }

    setSubmitting(true);

    try {
      await purchaseOrderService.generateLowStockPurchaseOrder({
        destination_location_id: lowStockLocationId,
        vendor_name: lowStockVendor.trim() || null,
        vendor_id: lowStockVendorId || null,
        notes: lowStockNotes.trim() || null,
      });

      toast.success("Low stock PO draft created");
      setLowStockOpen(false);
      setPage(1);
      await loadPurchaseOrders();
    } catch (error) {
      toast.error(
        "Failed to generate PO",
        getApiErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetailModal(po: PurchaseOrder) {
    setDetailPo(po);
    setLoadingDetail(true);

    try {
      const row = await purchaseOrderService.getPurchaseOrder(po.id);
      setDetailPo(row);
    } catch (error) {
      toast.error("Failed to load PO detail", getApiErrorMessage(error));
    } finally {
      setLoadingDetail(false);
    }
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white/92 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            Purchasing
          </p>
          <h1 className="text-2xl font-bold text-slate-950">
            Purchase Orders
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Plan buying, import item rows, and receive stock into warehouse.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={loadPurchaseOrders}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>

          {canWrite ? (
            <Button
              type="button"
              variant="secondary"
              onClick={openLowStockModal}
              disabled={loadingMaster}
            >
              <AlertTriangle size={16} />
              Low Stock
            </Button>
          ) : null}

          {canWrite ? (
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={loadingMaster}
            >
              <PackagePlus size={16} />
              New PO
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-500">
              Visible PO
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {poStats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-500">
              Ordered
            </p>
            <p className="mt-2 text-2xl font-bold text-sky-700">
              {poStats.ordered}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-500">
              Partial
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-700">
              {poStats.partial}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-500">
              Received
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {poStats.received}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>PO List</CardTitle>
              <CardDescription>
                Draft, order, receive, or cancel purchase orders.
              </CardDescription>
            </div>

            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={applyFilters}
            >
              <div className="relative min-w-0 sm:w-64">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search PO or vendor"
                />
              </div>

              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as PurchaseOrderStatus | "");
                  setPage(1);
                }}
                className="sm:w-48"
              >
                {statusOptions.map((option) => (
                  <option
                    key={option || "ALL"}
                    value={option}
                  >
                    {option || "All Status"}
                  </option>
                ))}
              </Select>

              <Button type="submit" variant="secondary">
                Apply
              </Button>
            </form>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-xl border border-teal-100">
            <div className="hidden grid-cols-[1.1fr_1.2fr_1fr_1fr_1.1fr_1.4fr] gap-3 bg-teal-50 px-4 py-3 text-xs font-bold uppercase text-teal-900 lg:grid">
              <span>PO</span>
              <span>Vendor</span>
              <span>Status</span>
              <span>Destination</span>
              <span>Dates</span>
              <span>Actions</span>
            </div>

            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Loading purchase orders...
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No purchase orders found.
              </div>
            ) : (
              <div className="divide-y divide-teal-100">
                {purchaseOrders.map((po) => {
                  const rows = getPoItems(po);
                  const ordered = rows.reduce(
                    (sum, item) =>
                      sum + (Number(item.qty_ordered) || 0),
                    0,
                  );
                  const received = rows.reduce(
                    (sum, item) =>
                      sum + (Number(item.qty_received) || 0),
                    0,
                  );

                  return (
                    <div
                      key={po.id}
                      className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.1fr_1.2fr_1fr_1fr_1.1fr_1.4fr] lg:items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-950">
                          {po.po_no || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {rows.length} item rows
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {po.vendor_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {po.source_type || "MANUAL"}
                        </p>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(
                            po.status,
                          )}`}
                        >
                          {po.status}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatNumber(received)} /{" "}
                          {formatNumber(ordered)}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {po.destination_location_code || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {po.destination_location_name || "-"}
                        </p>
                      </div>

                      <div className="text-xs text-slate-600">
                        <p>Order: {formatDate(po.order_date)}</p>
                        <p>ETA: {formatDate(po.expected_date)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailModal(po)}
                          disabled={loadingDetail}
                        >
                          <Eye size={14} />
                          Detail
                        </Button>

                        {canWrite && po.status === "DRAFT" ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOrder(po)}
                            disabled={submitting}
                          >
                            <Truck size={14} />
                            Order
                          </Button>
                        ) : null}

                        {canReceive &&
                        (po.status === "ORDERED" ||
                          po.status === "PARTIALLY_RECEIVED") ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openReceiveModal(po)}
                            disabled={submitting}
                          >
                            <Check size={14} />
                            Receive
                          </Button>
                        ) : null}

                        {canWrite &&
                        po.status !== "RECEIVED" &&
                        po.status !== "CANCELLED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleCancel(po)}
                            disabled={submitting}
                          >
                            <Ban size={14} />
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  loading ||
                  page >= Math.max(pagination.totalPages, 1)
                }
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm">
          <form
            onSubmit={handleCreatePo}
            className="my-4 w-full max-w-5xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-teal-100 p-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  New Purchase Order
                </h2>
                <p className="text-sm text-slate-500">
                  Create a draft PO from manual rows or pasted import data.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setCreateOpen(false)}
                aria-label="Close purchase order form"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    Vendor
                    <Select
                      value={vendorId}
                      onChange={(event) => {
                        const nextVendor = vendors.find(
                          (vendor) => vendor.id === event.target.value,
                        );
                        setVendorId(event.target.value);
                        setVendorName(nextVendor?.vendor_name || "");
                      }}
                      required
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.vendor_code || "VND"} - {vendor.vendor_name}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    Destination
                    <Select
                      value={destinationLocationId}
                      onChange={(event) =>
                        setDestinationLocationId(event.target.value)
                      }
                      required
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
                  </label>

                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    Order Date
                    <Input
                      type="date"
                      value={orderDate}
                      onChange={(event) =>
                        setOrderDate(event.target.value)
                      }
                      required
                    />
                  </label>

                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    Expected Date
                    <Input
                      type="date"
                      value={expectedDate}
                      onChange={(event) =>
                        setExpectedDate(event.target.value)
                      }
                    />
                  </label>
                </div>

                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Remarks
                  <Textarea
                    value={remarks}
                    onChange={(event) =>
                      setRemarks(event.target.value)
                    }
                    placeholder="Internal notes"
                  />
                </label>

                <div className="rounded-xl border border-teal-100">
                  <div className="flex flex-col gap-2 border-b border-teal-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">
                        PO Items
                      </p>
                      <p className="text-xs text-slate-500">
                        Item and quantity are mandatory.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addDraftItem}
                    >
                      <Plus size={14} />
                      Add Row
                    </Button>
                  </div>

                  <div className="divide-y divide-teal-100">
                    {draftItems.map((item, index) => (
                      <div
                        key={`${item.item_id}-${index}`}
                        className="grid gap-2 p-3 lg:grid-cols-[1.4fr_0.5fr_0.7fr_1fr_auto]"
                      >
                        <Select
                          value={item.item_id}
                          onChange={(event) =>
                            updateDraftItem(index, {
                              item_id: event.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select item</option>
                          {items.map((option) => (
                            <option
                              key={option.id}
                              value={option.id}
                            >
                              {itemLabel(option)}
                            </option>
                          ))}
                        </Select>

                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.qty_ordered}
                          onChange={(event) =>
                            updateDraftItem(index, {
                              qty_ordered: Number(
                                event.target.value,
                              ),
                            })
                          }
                          required
                        />

                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unit_price}
                          onChange={(event) =>
                            updateDraftItem(index, {
                              unit_price: Number(
                                event.target.value,
                              ),
                            })
                          }
                          placeholder="Unit price"
                        />

                        <Input
                          value={item.notes}
                          onChange={(event) =>
                            updateDraftItem(index, {
                              notes: event.target.value,
                            })
                          }
                          placeholder="Notes"
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDraftItem(index)}
                          disabled={draftItems.length === 1}
                          aria-label="Remove item row"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-teal-100 p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(["MANUAL", "SPREADSHEET", "AI_PHOTO"] as const).map(
                      (option) => (
                        <button
                          key={option}
                          type="button"
                          className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                            sourceType === option
                              ? "border-teal-500 bg-teal-50 text-teal-800"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                          onClick={() => setSourceType(option)}
                        >
                          {option}
                        </button>
                      ),
                    )}
                  </div>

                  <label className="mt-3 block space-y-1 text-sm font-semibold text-slate-700">
                    Spreadsheet or OCR Text
                    <Textarea
                      value={rawImport}
                      onChange={(event) =>
                        setRawImport(event.target.value)
                      }
                      placeholder="item_code, item_name, qty, unit_price, notes"
                      className="min-h-36"
                    />
                  </label>

                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={handleParseImport}
                    disabled={parsingImport}
                  >
                    <Upload size={16} />
                    {parsingImport ? "Parsing..." : "Parse Import"}
                  </Button>
                </div>

                <div className="rounded-xl border border-teal-100">
                  <div className="border-b border-teal-100 p-3">
                    <p className="font-bold text-slate-950">
                      Import Review
                    </p>
                    <p className="text-xs text-slate-500">
                      Rows that match item master replace PO item rows.
                    </p>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-teal-100">
                    {importRows.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500">
                        No parsed rows yet.
                      </p>
                    ) : (
                      importRows.map((row) => (
                        <div
                          key={row.row_number}
                          className="p-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800">
                                {row.item_code || "-"} {row.item_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                Qty {formatNumber(row.qty_ordered)} -
                                Unit {formatCurrency(row.unit_price)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${
                                row.matched
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {row.matched ? "Matched" : "Review"}
                            </span>
                          </div>
                          {row.errors.length > 0 ? (
                            <p className="mt-1 text-xs text-red-600">
                              {row.errors.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-teal-100 p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || loadingMaster}
              >
                {submitting ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {receivingPo ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm">
          <form
            onSubmit={handleReceive}
            className="my-4 w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-teal-100 p-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Receive PO {receivingPo.po_no}
                </h2>
                <p className="text-sm text-slate-500">
                  Received quantities create stock movements.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setReceivingPo(null)}
                aria-label="Close receive form"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {receiveItems.map((item, index) => (
                <div
                  key={item.purchase_order_item_id}
                  className="grid gap-2 rounded-xl border border-teal-100 p-3 md:grid-cols-[1fr_0.6fr_0.7fr]"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.item_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Remaining {formatNumber(item.remaining_qty)}
                    </p>
                  </div>

                  <Input
                    type="number"
                    min="0"
                    max={item.remaining_qty}
                    step="0.001"
                    value={item.qty_received}
                    onChange={(event) =>
                      updateReceiveItem(index, {
                        qty_received: Number(event.target.value),
                      })
                    }
                    required
                  />

                  <Input
                    value={item.notes}
                    onChange={(event) =>
                      updateReceiveItem(index, {
                        notes: event.target.value,
                      })
                    }
                    placeholder="Notes"
                  />
                </div>
              ))}

              <label className="block space-y-1 text-sm font-semibold text-slate-700">
                Receive Remarks
                <Textarea
                  value={receiveRemarks}
                  onChange={(event) =>
                    setReceiveRemarks(event.target.value)
                  }
                  placeholder="Supplier document, condition, or other notes"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 border-t border-teal-100 p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReceivingPo(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Receiving..." : "Receive Stock"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {detailPo ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm">
          <div className="my-4 w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-teal-100 p-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  PO Detail {detailPo.po_no}
                </h2>
                <p className="text-sm text-slate-500">
                  {detailPo.vendor_name} - {detailPo.status}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setDetailPo(null)}
                aria-label="Close PO detail"
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <p className="p-6 text-sm text-slate-500">
                Loading PO detail...
              </p>
            ) : (
              <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border border-teal-100 p-3">
                    <p className="text-xs font-bold uppercase text-teal-700">
                      Items
                    </p>
                    <div className="mt-3 divide-y divide-teal-100">
                      {getPoItems(detailPo).map((item) => (
                        <div
                          key={item.id || item.item_id}
                          className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_0.6fr_0.6fr_0.7fr]"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {getItemName(item)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.item_code || item.item_id}
                            </p>
                          </div>
                          <span>
                            Ordered {formatNumber(item.qty_ordered)}
                          </span>
                          <span>
                            Received {formatNumber(item.qty_received)}
                          </span>
                          <span>
                            {formatCurrency(item.unit_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-teal-100 p-3">
                    <p className="text-xs font-bold uppercase text-teal-700">
                      Receipts
                    </p>
                    <div className="mt-3 divide-y divide-teal-100">
                      {(detailPo.purchase_receipts ?? []).length === 0 ? (
                        <p className="py-3 text-sm text-slate-500">
                          No receipts yet.
                        </p>
                      ) : (
                        detailPo.purchase_receipts?.map((receipt) => (
                          <div key={receipt.id} className="py-3 text-sm">
                            <p className="font-semibold text-slate-900">
                              {receipt.receipt_no || receipt.id}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(receipt.received_at)} -{" "}
                              {receipt.notes || "-"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-teal-100 p-3">
                    <p className="text-xs font-bold uppercase text-teal-700">
                      Vendor
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {detailPo.vendor_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {detailPo.vendor_code || "-"}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {detailPo.vendor_phone || detailPo.vendor_email || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-teal-100 p-3">
                    <p className="text-xs font-bold uppercase text-teal-700">
                      Destination
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {detailPo.destination_location_code || "-"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {detailPo.destination_location_name || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-teal-100 p-3">
                    <p className="text-xs font-bold uppercase text-teal-700">
                      Event Log
                    </p>
                    <div className="mt-3 divide-y divide-teal-100">
                      {(detailPo.purchase_order_events ?? []).length === 0 ? (
                        <p className="py-3 text-sm text-slate-500">
                          No events yet.
                        </p>
                      ) : (
                        detailPo.purchase_order_events?.map((event, index) => (
                          <div
                            key={event.id || index}
                            className="py-3 text-sm"
                          >
                            <p className="font-semibold text-slate-900">
                              {event.event_type || "-"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(event.created_at)} -{" "}
                              {event.notes || "-"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {lowStockOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm">
          <div className="my-4 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-teal-100 p-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Low Stock Reorder
                </h2>
                <p className="text-sm text-slate-500">
                  Items already covered by open PO are excluded.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setLowStockOpen(false)}
                aria-label="Close low stock reorder"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Location
                  <Select
                    value={lowStockLocationId}
                    onChange={(event) => {
                      setLowStockLocationId(event.target.value);
                      loadLowStockCandidates(event.target.value);
                    }}
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {locationLabel(location)}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Vendor
                  <Select
                    value={lowStockVendorId}
                    onChange={(event) => {
                      const nextVendor = vendors.find(
                        (vendor) => vendor.id === event.target.value,
                      );
                      setLowStockVendorId(event.target.value);
                      setLowStockVendor(nextVendor?.vendor_name || "");
                    }}
                  >
                    <option value="">Auto / no vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_code || "VND"} - {vendor.vendor_name}
                      </option>
                    ))}
                  </Select>
                </label>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={() => loadLowStockCandidates()}
                    disabled={loadingLowStock}
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </Button>
                </div>
              </div>

              <label className="block space-y-1 text-sm font-semibold text-slate-700">
                Notes
                <Textarea
                  value={lowStockNotes}
                  onChange={(event) =>
                    setLowStockNotes(event.target.value)
                  }
                />
              </label>

              <div className="overflow-hidden rounded-xl border border-teal-100">
                <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-3 bg-teal-50 px-4 py-3 text-xs font-bold uppercase text-teal-900">
                  <span>Item</span>
                  <span>Current</span>
                  <span>Minimum</span>
                  <span>Suggested PO</span>
                </div>

                {loadingLowStock ? (
                  <p className="p-4 text-sm text-slate-500">
                    Loading low stock candidates...
                  </p>
                ) : lowStockRows.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">
                    No uncovered low-stock items for this location.
                  </p>
                ) : (
                  <div className="divide-y divide-teal-100">
                    {lowStockRows.map((row) => (
                      <div
                        key={row.item_id}
                        className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {row.item_code}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.item_name}
                          </p>
                        </div>
                        <span>{formatNumber(row.current_qty)}</span>
                        <span>{formatNumber(row.min_stock)}</span>
                        <span className="font-bold text-teal-700">
                          {formatNumber(row.suggested_qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-teal-100 p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLowStockOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleGenerateLowStockPo}
                disabled={
                  submitting ||
                  loadingLowStock ||
                  lowStockRows.length === 0
                }
              >
                {submitting ? "Generating..." : "Generate Draft PO"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
