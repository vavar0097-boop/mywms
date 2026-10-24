import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/shared/lib/api/error";
import { toast } from "@/shared/ui/toast";
import { MasterDataShell } from "../components/MasterDataShell";
import { StatusPill } from "../components/StatusPill";
import {
  ItemPayload,
  ItemRow,
  Pagination,
  UnitRow,
  VendorRow,
  masterDataPageService,
} from "../services/master-data-page.service";

const itemTypes = [
  "RAW_MATERIAL",
  "FINISHED_GOOD",
  "SUPPLY",
  "ASSET",
];

const initialPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

type ItemFormState = {
  item_name: string;
  item_type: string;
  base_unit_id: string;
  barcode: string;
  description: string;
  min_stock: number;
  reorder_qty: number;
  default_vendor_name: string;
  default_vendor_id: string;
  is_active: boolean;
};

const emptyForm: ItemFormState = {
  item_name: "",
  item_type: "RAW_MATERIAL",
  base_unit_id: "",
  barcode: "",
  description: "",
  min_stock: 0,
  reorder_qty: 0,
  default_vendor_name: "",
  default_vendor_id: "",
  is_active: true,
};

function toPayload(form: ItemFormState): ItemPayload {
  return {
    item_name: form.item_name.trim(),
    item_type: form.item_type,
    base_unit_id: form.base_unit_id,
    ...(form.barcode.trim()
      ? { barcode: form.barcode.trim() }
      : {}),
    ...(form.description.trim()
      ? { description: form.description.trim() }
      : {}),
    min_stock: Number(form.min_stock) || 0,
    reorder_qty: Number(form.reorder_qty) || 0,
    default_vendor_name: form.default_vendor_name.trim() || null,
    default_vendor_id: form.default_vendor_id || null,
    is_active: form.is_active,
  };
}

export function ItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [pagination, setPagination] =
    useState(initialPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ItemRow | null>(
    null,
  );
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );

  async function loadUnits() {
    const [rows, vendorRows] = await Promise.all([
      masterDataPageService.getUnits({
        limit: 100,
      }),
      masterDataPageService.getVendors({
        limit: 200,
      }),
    ]);

    setUnits(rows);
    setVendors(vendorRows.filter((vendor) => vendor.is_active ?? true));

    if (!form.base_unit_id && rows[0]?.id) {
      setForm((current) => ({
        ...current,
        base_unit_id: rows[0].id,
      }));
    }
  }

  useEffect(() => {
    loadUnits().catch((error) => {
      toast.error(
        "Units failed to load",
        getApiErrorMessage(error),
      );
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      setIsLoading(true);

      try {
        const result = await masterDataPageService.getItems({
          page,
          limit: 20,
          ...(search.trim() ? { search: search.trim() } : {}),
        });

        if (!mounted) return;

        setItems(result.data);
        setPagination(result.pagination);
      } catch (error) {
        if (!mounted) return;

        toast.error(
          "Items failed to load",
          getApiErrorMessage(error),
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadItems, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [search, page, reloadKey]);

  // Reset back to page 1 whenever the search term or a manual
  // reload changes the result set, otherwise the user can get
  // stuck on an out-of-range page showing "No items found."
  useEffect(() => {
    setPage(1);
  }, [search, reloadKey]);

  function openCreateModal() {
    setEditingItem(null);
    setForm({
      ...emptyForm,
      base_unit_id: units[0]?.id ?? "",
    });
    setModalOpen(true);
  }

  function openEditModal(item: ItemRow) {
    setEditingItem(item);
    setForm({
      item_name: item.item_name,
      item_type: item.item_type || "RAW_MATERIAL",
      base_unit_id:
        item.base_unit_id ||
        units.find((unit) => unit.code === item.units?.code)?.id ||
        "",
      barcode: item.barcode || "",
      description: item.description || "",
      min_stock: Number(item.min_stock) || 0,
      reorder_qty: Number(item.reorder_qty) || 0,
      default_vendor_name: item.default_vendor_name || "",
      default_vendor_id: item.default_vendor_id || "",
      is_active: item.is_active ?? true,
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.item_name.trim() || !form.base_unit_id) {
      toast.error(
        "Item form incomplete",
        "Item name and base unit are required.",
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editingItem) {
        await masterDataPageService.updateItem(
          editingItem.id,
          toPayload(form),
        );
        toast.success("Item updated", form.item_name.trim());
      } else {
        await masterDataPageService.createItem(toPayload(form));
        toast.success("Item created", form.item_name.trim());
      }

      closeModal();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        editingItem
          ? "Item update failed"
          : "Item creation failed",
        getApiErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: ItemRow) {
    const confirmed = window.confirm(
      `Delete item ${item.item_code} - ${item.item_name}?`,
    );

    if (!confirmed) return;

    setDeletingId(item.id);

    try {
      await masterDataPageService.deleteItem(item.id);
      toast.success("Item deleted", item.item_name);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        "Item delete failed",
        getApiErrorMessage(error),
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <MasterDataShell
      title="Items"
      description="Create, edit, and manage inventory master items."
      action={
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add Item
        </button>
      }
    >
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search code, name, or barcode"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-slate-500">
              {pagination.total} items
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Refresh items"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Item
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Unit
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reorder
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    Loading items...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    No items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const unit =
                    item.base_unit_id
                      ? unitById.get(item.base_unit_id)
                      : null;

                  return (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-950">
                        {item.item_code}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-950">
                          {item.item_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.barcode || "No barcode"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {item.item_type || "-"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {unit?.code || item.units?.code || "-"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        Min {Number(item.min_stock) || 0} / PO{" "}
                        {Number(item.reorder_qty) || 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusPill active={item.is_active} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                            aria-label={`Edit ${item.item_name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Delete ${item.item_name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of{" "}
            {Math.max(pagination.totalPages, 1)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={
                page >= Math.max(pagination.totalPages, 1) ||
                isLoading
              }
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingItem ? "Edit Item" : "Add Item"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingItem
                    ? editingItem.item_code
                    : "Create a new inventory master item."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close item form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Item Name
                  </span>
                  <input
                    value={form.item_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        item_name: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required
                    minLength={3}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Item Type
                  </span>
                  <select
                    value={form.item_type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        item_type: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    {itemTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Base Unit
                  </span>
                  <select
                    value={form.base_unit_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        base_unit_id: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required
                  >
                    <option value="">Select unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.code} - {unit.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Barcode
                  </span>
                  <input
                    value={form.barcode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        barcode: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Minimum Stock
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.min_stock}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        min_stock: Number(event.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Reorder Qty
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.reorder_qty}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reorder_qty: Number(event.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Default Vendor
                  </span>
                  <select
                    value={form.default_vendor_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        default_vendor_id: event.target.value,
                        default_vendor_name:
                          vendors.find(
                            (vendor) => vendor.id === event.target.value,
                          )?.vendor_name || current.default_vendor_name,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="">No default vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_code || "VND"} - {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-end gap-3 rounded-xl border border-slate-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                    className="mb-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    Active item
                  </span>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Description
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Saving..."
                    : editingItem
                      ? "Save Changes"
                      : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </MasterDataShell>
  );
}
