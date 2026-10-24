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
import {
  hasPermission,
  PERMISSIONS,
} from "@/shared/auth/permissions";
import { toast } from "@/shared/ui/toast";
import { useAuthStore } from "@/stores/auth.store";
import { MasterDataShell } from "../components/MasterDataShell";
import { StatusPill } from "../components/StatusPill";
import {
  LocationPayload,
  LocationRow,
  WarehouseRow,
  masterDataPageService,
} from "../services/master-data-page.service";

const locationTypes = ["ZONE", "AISLE", "RACK", "BIN", "OUTLET"];

type LocationForm = {
  location_code: string;
  location_name: string;
  location_type: string;
  warehouse_id: string;
  parent_id: string;
  is_active: boolean;
};

const emptyForm: LocationForm = {
  location_code: "",
  location_name: "",
  location_type: "BIN",
  warehouse_id: "",
  parent_id: "",
  is_active: true,
};

function toPayload(form: LocationForm): LocationPayload {
  return {
    ...(form.location_code.trim()
      ? { location_code: form.location_code.trim() }
      : {}),
    location_name: form.location_name.trim(),
    location_type: form.location_type,
    warehouse_id: form.warehouse_id,
    parent_id: form.parent_id || null,
    is_active: form.is_active,
  };
}

export function LocationsPage() {
  const userRole = useAuthStore((state) => state.user?.role);
  const canWrite = hasPermission(userRole, PERMISSIONS.LOCATIONS_WRITE);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] =
    useState<LocationRow | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const warehouseMap = useMemo(
    () =>
      new Map(
        warehouses.map((warehouse) => [
          warehouse.id,
          warehouse.warehouse_name,
        ]),
      ),
    [warehouses],
  );

  const parentOptions = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.id !== editingLocation?.id &&
          location.warehouse_id === form.warehouse_id,
      ),
    [editingLocation?.id, form.warehouse_id, locations],
  );

  useEffect(() => {
    let mounted = true;

    async function loadWarehouses() {
      try {
        const rows = await masterDataPageService.getWarehouses({
          limit: 100,
        });

        if (mounted) {
          setWarehouses(rows);
        }
      } catch (error) {
        if (mounted) {
          toast.error(
            "Warehouses failed to load",
            getApiErrorMessage(error),
          );
        }
      }
    }

    loadWarehouses();

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let mounted = true;

    async function loadLocations() {
      setIsLoading(true);

      try {
        const rows = await masterDataPageService.getLocations({
          limit: 200,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(warehouseId ? { warehouse_id: warehouseId } : {}),
        });

        if (!mounted) return;

        setLocations(rows);
      } catch (error) {
        if (!mounted) return;

        toast.error(
          "Locations failed to load",
          getApiErrorMessage(error),
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadLocations, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [search, warehouseId, reloadKey]);

  function openCreateModal() {
    setEditingLocation(null);
    setForm({
      ...emptyForm,
      warehouse_id: warehouseId || warehouses[0]?.id || "",
    });
    setModalOpen(true);
  }

  function openEditModal(location: LocationRow) {
    setEditingLocation(location);
    setForm({
      location_code: location.location_code,
      location_name: location.location_name,
      location_type: location.location_type || "BIN",
      warehouse_id: location.warehouse_id || "",
      parent_id: location.parent_id || "",
      is_active: location.is_active ?? true,
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setModalOpen(false);
    setEditingLocation(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.location_name.trim() ||
      !form.warehouse_id
    ) {
      toast.error(
        "Location form incomplete",
        "Location name and warehouse are required. Code can be auto-generated.",
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editingLocation) {
        await masterDataPageService.updateLocation(
          editingLocation.id,
          toPayload(form),
        );
        toast.success(
          "Location updated",
          form.location_name.trim(),
        );
      } else {
        await masterDataPageService.createLocation(toPayload(form));
        toast.success(
          "Location created",
          form.location_name.trim(),
        );
      }

      closeModal();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        editingLocation
          ? "Location update failed"
          : "Location creation failed",
        getApiErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(location: LocationRow) {
    const confirmed = window.confirm(
      `Delete location ${location.location_code} - ${location.location_name}?`,
    );

    if (!confirmed) return;

    setDeletingId(location.id);

    try {
      await masterDataPageService.deleteLocation(location.id);
      toast.success("Location deleted", location.location_name);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        "Location delete failed",
        getApiErrorMessage(error),
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <MasterDataShell
      title="Locations"
      description="Create, edit, and manage warehouse locations."
      action={canWrite ? (
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add Location
        </button>
      ) : null}
    >
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
                placeholder="Search code or name"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
              <option value="">All warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouse_code} - {warehouse.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-slate-500">
              {locations.length} locations
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Refresh locations"
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
                  Location
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Warehouse
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
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    Loading locations...
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    No locations found.
                  </td>
                </tr>
              ) : (
                locations.map((location) => (
                  <tr key={location.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-950">
                      {location.location_code}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-950">
                      {location.location_name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {location.location_type || "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {location.warehouse_id
                        ? warehouseMap.get(location.warehouse_id) ||
                          location.warehouse_id
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusPill active={location.is_active} />
                    </td>
                    {canWrite ? (
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(location)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          aria-label={`Edit ${location.location_name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(location)}
                          disabled={deletingId === location.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${location.location_name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                    ) : (
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-400">
                        Read only
                      </td>
                    )}
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
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingLocation
                    ? "Edit Location"
                    : "Add Location"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Leave code empty to auto-generate a unique location code.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close location form"
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
                    value={form.location_code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location_code: event.target.value,
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
                    value={form.location_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location_name: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Type
                  </span>
                  <select
                    value={form.location_type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location_type: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    {locationTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Warehouse
                  </span>
                  <select
                    value={form.warehouse_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        warehouse_id: event.target.value,
                        parent_id: "",
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouse_code} - {warehouse.warehouse_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Parent Location
                  </span>
                  <select
                    value={form.parent_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        parent_id: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="">No parent</option>
                    {parentOptions.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.location_code} - {location.location_name}
                      </option>
                    ))}
                  </select>
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
                  Active location
                </span>
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
                  {isSaving ? "Saving..." : "Save Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </MasterDataShell>
  );
}
