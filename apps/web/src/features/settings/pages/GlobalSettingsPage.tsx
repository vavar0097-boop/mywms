import {
  FlaskConical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import {
  ItemRow,
  masterDataPageService,
} from "@/features/master-data/services/master-data-page.service";
import { getApiErrorMessage } from "@/shared/lib/api/error";
import { toast } from "@/shared/ui/toast";
import {
  PosMenuItem,
  PosMenuBomComponent,
  PosMenuPayload,
  posSettingsService,
} from "../services/pos-settings.service";

type MenuForm = {
  item_id: string;
  menu_code: string;
  menu_name: string;
  category: string;
  price: string;
  is_visible: boolean;
  is_available: boolean;
  sort_order: string;
};

type BomFormRow = {
  component_item_id: string;
  quantity_per_menu: string;
  tolerance_percent: string;
  is_fixed_quantity: boolean;
  notes: string;
};

const emptyForm: MenuForm = {
  item_id: "",
  menu_code: "",
  menu_name: "",
  category: "",
  price: "",
  is_visible: true,
  is_available: true,
  sort_order: "0",
};

const emptyBomRow: BomFormRow = {
  component_item_id: "",
  quantity_per_menu: "1",
  tolerance_percent: "3",
  is_fixed_quantity: false,
  notes: "",
};

function money(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function toPayload(form: MenuForm): PosMenuPayload {
  return {
    item_id: form.item_id || null,
    menu_code: form.menu_code.trim(),
    menu_name: form.menu_name.trim(),
    category: form.category.trim() || null,
    price: Number(form.price),
    is_visible: form.is_visible,
    is_available: form.is_available,
    sort_order: Number(form.sort_order) || 0,
  };
}

function toBomRows(components: PosMenuBomComponent[]): BomFormRow[] {
  return components.length > 0
    ? components.map((component) => ({
        component_item_id: component.component_item_id,
        quantity_per_menu: String(component.quantity_per_menu),
        tolerance_percent: String(component.tolerance_percent ?? 3),
        is_fixed_quantity: component.is_fixed_quantity,
        notes: component.notes || "",
      }))
    : [{ ...emptyBomRow }];
}

function toBomPayload(rows: BomFormRow[]) {
  return {
    components: rows
      .filter((row) => row.component_item_id)
      .map((row) => ({
        component_item_id: row.component_item_id,
        quantity_per_menu: Number(row.quantity_per_menu),
        tolerance_percent: row.is_fixed_quantity
          ? 0
          : Number(row.tolerance_percent),
        is_fixed_quantity: row.is_fixed_quantity,
        notes: row.notes.trim() || null,
      })),
  };
}

export function GlobalSettingsPage() {
  const [menuItems, setMenuItems] = useState<PosMenuItem[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<PosMenuItem | null>(null);
  const [bomEditing, setBomEditing] = useState<PosMenuItem | null>(null);
  const [bomRows, setBomRows] = useState<BomFormRow[]>([
    { ...emptyBomRow },
  ]);
  const [form, setForm] = useState<MenuForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [bomModalOpen, setBomModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isBomSaving, setIsBomSaving] = useState(false);

  useEffect(() => {
    masterDataPageService
      .getItems({
        page: 1,
        limit: 100,
      })
      .then((result) => setItems(result.data))
      .catch((error) =>
        toast.error(
          "Items failed to load",
          getApiErrorMessage(error),
        ),
      );
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadMenu() {
      setIsLoading(true);

      try {
        const rows = await posSettingsService.getMenuItems({
          limit: 200,
          ...(search.trim() ? { search: search.trim() } : {}),
        });

        if (mounted) setMenuItems(rows);
      } catch (error) {
        if (mounted) {
          toast.error(
            "POS menu failed to load",
            getApiErrorMessage(error),
          );
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    const timer = window.setTimeout(loadMenu, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [search, reloadKey]);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(row: PosMenuItem) {
    setEditing(row);
    setForm({
      item_id: row.item_id || "",
      menu_code: row.menu_code,
      menu_name: row.menu_name,
      category: row.category || "",
      price: String(row.price),
      is_visible: row.is_visible,
      is_available: row.is_available,
      sort_order: String(row.sort_order ?? 0),
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(false);
  }

  async function openBomModal(row: PosMenuItem) {
    setBomEditing(row);
    setBomModalOpen(true);
    setBomRows(toBomRows(row.bom_components ?? []));

    try {
      const components = await posSettingsService.getBom(row.id);
      setBomRows(toBomRows(components));
    } catch (error) {
      toast.error("BOM failed to load", getApiErrorMessage(error));
    }
  }

  function closeBomModal() {
    if (isBomSaving) return;
    setBomEditing(null);
    setBomRows([{ ...emptyBomRow }]);
    setBomModalOpen(false);
  }

  function updateBomRow(
    index: number,
    patch: Partial<BomFormRow>,
  ) {
    setBomRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function addBomRow() {
    setBomRows((current) => [...current, { ...emptyBomRow }]);
  }

  function removeBomRow(index: number) {
    setBomRows((current) =>
      current.length === 1
        ? [{ ...emptyBomRow }]
        : current.filter((_, rowIndex) => rowIndex !== index),
    );
  }

  async function handleBomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bomEditing) return;

    const payload = toBomPayload(bomRows);

    const invalid = payload.components.some(
      (component) =>
        !component.component_item_id ||
        component.quantity_per_menu <= 0 ||
        component.tolerance_percent < 0 ||
        component.tolerance_percent > 3,
    );

    if (invalid) {
      toast.error(
        "BOM form incomplete",
        "Component, quantity, and tolerance 0-3% are required.",
      );
      return;
    }

    setIsBomSaving(true);

    try {
      await posSettingsService.replaceBom(bomEditing.id, payload);
      toast.success("BOM saved", bomEditing.menu_name);
      closeBomModal();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error("BOM save failed", getApiErrorMessage(error));
    } finally {
      setIsBomSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.menu_code.trim() ||
      !form.menu_name.trim() ||
      Number(form.price) < 0
    ) {
      toast.error(
        "POS menu form incomplete",
        "Menu code, name, and valid price are required.",
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editing) {
        await posSettingsService.updateMenuItem(
          editing.id,
          toPayload(form),
        );
        toast.success("POS menu updated", form.menu_name);
      } else {
        await posSettingsService.createMenuItem(toPayload(form));
        toast.success("POS menu created", form.menu_name);
      }

      closeModal();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        editing ? "POS menu update failed" : "POS menu creation failed",
        getApiErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(row: PosMenuItem) {
    if (!window.confirm(`Delete POS menu ${row.menu_name}?`)) return;

    try {
      await posSettingsService.deleteMenuItem(row.id);
      toast.success("POS menu deleted", row.menu_name);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        "POS menu delete failed",
        getApiErrorMessage(error),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Global Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure POS menu visibility, availability, and prices.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add POS Menu
        </button>
      </div>

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
              placeholder="Search POS menu"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Refresh POS menu"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Code", "Menu", "Category", "Price", "POS", "Actions"].map(
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
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                    Loading POS menu...
                  </td>
                </tr>
              ) : menuItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                    No POS menu found.
                  </td>
                </tr>
              ) : (
                menuItems.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-950">
                      {row.menu_code}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-950">
                        {row.menu_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.items?.item_code || "No stock item link"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {row.category || "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-950">
                      {money(row.price)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {row.is_visible ? "Visible" : "Hidden"} /{" "}
                      {row.is_available ? "Available" : "Unavailable"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => openBomModal(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 text-emerald-700 transition hover:bg-emerald-50"
                          aria-label="Edit BOM"
                        >
                          <FlaskConical size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          aria-label="Edit POS menu"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                          aria-label="Delete POS menu"
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
                {editing ? "Edit POS Menu" : "Add POS Menu"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close POS menu form"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.menu_code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      menu_code: event.target.value,
                    }))
                  }
                  placeholder="Menu code"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  required
                />
                <input
                  value={form.menu_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      menu_name: event.target.value,
                    }))
                  }
                  placeholder="Menu name"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  required
                />
                <select
                  value={form.item_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      item_id: event.target.value,
                    }))
                  }
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none md:col-span-2"
                >
                  <option value="">No stock item link</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_code} - {item.item_name}
                    </option>
                  ))}
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
                />
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  placeholder="Price"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  required
                />
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sort_order: event.target.value,
                    }))
                  }
                  placeholder="Sort order"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_visible}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_visible: event.target.checked,
                      }))
                    }
                  />
                  Show in POS
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_available: event.target.checked,
                      }))
                    }
                  />
                  Available
                </label>
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
                  {isSaving ? "Saving..." : "Save POS Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {bomModalOpen && bomEditing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  BOM - {bomEditing.menu_name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use tolerance 1-3% for flexible recipes. Set fixed for exact pack items like cups and sachets.
                </p>
              </div>
              <button
                type="button"
                onClick={closeBomModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close BOM form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBomSubmit} className="space-y-4 p-5">
              <div className="space-y-3">
                {bomRows.map((row, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1.6fr_0.6fr_0.6fr_0.8fr_auto]"
                  >
                    <select
                      value={row.component_item_id}
                      onChange={(event) =>
                        updateBomRow(index, {
                          component_item_id: event.target.value,
                        })
                      }
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                    >
                      <option value="">Select component item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.item_code} - {item.item_name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={row.quantity_per_menu}
                      onChange={(event) =>
                        updateBomRow(index, {
                          quantity_per_menu: event.target.value,
                        })
                      }
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none"
                      placeholder="Qty"
                    />

                    <input
                      type="number"
                      min="0"
                      max="3"
                      step="0.1"
                      value={row.tolerance_percent}
                      disabled={row.is_fixed_quantity}
                      onChange={(event) =>
                        updateBomRow(index, {
                          tolerance_percent: event.target.value,
                        })
                      }
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none disabled:bg-slate-50"
                      placeholder="Tol %"
                    />

                    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={row.is_fixed_quantity}
                        onChange={(event) =>
                          updateBomRow(index, {
                            is_fixed_quantity: event.target.checked,
                            tolerance_percent: event.target.checked
                              ? "0"
                              : row.tolerance_percent || "3",
                          })
                        }
                      />
                      Fixed
                    </label>

                    <button
                      type="button"
                      onClick={() => removeBomRow(index)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                      aria-label="Remove BOM component"
                    >
                      <Trash2 size={15} />
                    </button>

                    <input
                      value={row.notes}
                      onChange={(event) =>
                        updateBomRow(index, {
                          notes: event.target.value,
                        })
                      }
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none md:col-span-5"
                      placeholder="Notes"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={addBomRow}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                >
                  <Plus size={16} />
                  Add Component
                </button>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeBomModal}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBomSaving}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isBomSaving ? "Saving..." : "Save BOM"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
