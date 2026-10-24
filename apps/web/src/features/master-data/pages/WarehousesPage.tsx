import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { getApiErrorMessage } from "@/shared/lib/api/error";
import { toast } from "@/shared/ui/toast";
import { MasterDataShell } from "../components/MasterDataShell";
import { StatusPill } from "../components/StatusPill";
import {
  WarehousePayload,
  WarehouseRow,
  masterDataPageService,
} from "../services/master-data-page.service";

type WarehouseForm = {
  warehouse_code: string;
  warehouse_name: string;
  address: string;
  is_active: boolean;
};

const emptyForm: WarehouseForm = {
  warehouse_code: "",
  warehouse_name: "",
  address: "",
  is_active: true,
};

function toPayload(form: WarehouseForm): WarehousePayload {
  return {
    ...(form.warehouse_code.trim()
      ? { warehouse_code: form.warehouse_code.trim() }
      : {}),
    warehouse_name: form.warehouse_name.trim(),
    address: form.address.trim() || null,
    is_active: form.is_active,
  };
}

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingWarehouse, setEditingWarehouse] =
    useState<WarehouseRow | null>(null);
  const [form, setForm] = useState<WarehouseForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadWarehouses() {
      setIsLoading(true);

      try {
        const rows = await masterDataPageService.getWarehouses({
          limit: 100,
          ...(search.trim() ? { search: search.trim() } : {}),
        });

        if (!mounted) return;

        setWarehouses(rows);
      } catch (error) {
        if (!mounted) return;

        toast.error(
          "Warehouses failed to load",
          getApiErrorMessage(error),
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadWarehouses, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [search, reloadKey]);

  function openCreateModal() {
    setEditingWarehouse(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(warehouse: WarehouseRow) {
    setEditingWarehouse(warehouse);
    setForm({
      warehouse_code: warehouse.warehouse_code,
      warehouse_name: warehouse.warehouse_name,
      address: warehouse.address || "",
      is_active: warehouse.is_active ?? true,
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setModalOpen(false);
    setEditingWarehouse(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.warehouse_name.trim()
    ) {
      toast.error(
        "Warehouse form incomplete",
        "Warehouse name is required. Code can be auto-generated.",
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editingWarehouse) {
        await masterDataPageService.updateWarehouse(
          editingWarehouse.id,
          toPayload(form),
        );
        toast.success(
          "Warehouse updated",
          form.warehouse_name.trim(),
        );
      } else {
        await masterDataPageService.createWarehouse(toPayload(form));
        toast.success(
          "Warehouse created",
          form.warehouse_name.trim(),
        );
      }

      closeModal();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        editingWarehouse
          ? "Warehouse update failed"
          : "Warehouse creation failed",
        getApiErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(warehouse: WarehouseRow) {
    const confirmed = window.confirm(
      `Delete warehouse ${warehouse.warehouse_code} - ${warehouse.warehouse_name}?`,
    );

    if (!confirmed) return;

    setDeletingId(warehouse.id);

    try {
      await masterDataPageService.deleteWarehouse(warehouse.id);
      toast.success("Warehouse deleted", warehouse.warehouse_name);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        "Warehouse delete failed",
        getApiErrorMessage(error),
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <MasterDataShell
      title="Warehouses"
      description="Create, edit, and manage warehouse master data."
      action={
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add Warehouse
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
              placeholder="Search code or name"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-slate-500">
              {warehouses.length} warehouses
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Refresh warehouses"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
              />
            ))
          ) : warehouses.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No warehouses found.
            </div>
          ) : (
            warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {warehouse.warehouse_code}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-slate-800">
                      {warehouse.warehouse_name}
                    </h2>
                  </div>
                  <StatusPill active={warehouse.is_active} />
                </div>

                <p className="mt-4 min-h-10 text-sm text-slate-500">
                  {warehouse.address || "No address recorded."}
                </p>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(warehouse)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                    aria-label={`Edit ${warehouse.warehouse_name}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(warehouse)}
                    disabled={deletingId === warehouse.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Delete ${warehouse.warehouse_name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingWarehouse
                    ? "Edit Warehouse"
                    : "Add Warehouse"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Leave code empty to auto-generate a unique warehouse code.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close warehouse form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Code
                  </span>
                  <input
                    value={form.warehouse_code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        warehouse_code: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    placeholder="Auto-generated if empty"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Name
                  </span>
                  <input
                    value={form.warehouse_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        warehouse_name: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Active warehouse
                </span>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Address
                </span>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </label>

              <div className="flex justify-end gap-3">
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
                  {isSaving ? "Saving..." : "Save Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </MasterDataShell>
  );
}
