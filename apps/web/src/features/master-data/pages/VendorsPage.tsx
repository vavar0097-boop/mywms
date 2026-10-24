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
  VendorPayload,
  VendorRow,
  masterDataPageService,
} from "../services/master-data-page.service";

type VendorFormState = {
  vendor_code: string;
  vendor_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
};

const emptyForm: VendorFormState = {
  vendor_code: "",
  vendor_name: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  is_active: true,
};

function toPayload(form: VendorFormState): VendorPayload {
  return {
    ...(form.vendor_code.trim()
      ? { vendor_code: form.vendor_code.trim() }
      : {}),
    vendor_name: form.vendor_name.trim(),
    contact_name: form.contact_name.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    notes: form.notes.trim() || null,
    is_active: form.is_active,
  };
}

export function VendorsPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVendor, setEditingVendor] =
    useState<VendorRow | null>(null);
  const [form, setForm] = useState<VendorFormState>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadVendors() {
      setIsLoading(true);

      try {
        const rows = await masterDataPageService.getVendors({
          search: search.trim() || undefined,
          limit: 200,
        });

        if (mounted) {
          setVendors(rows);
        }
      } catch (error) {
        if (mounted) {
          toast.error(
            "Vendors failed to load",
            getApiErrorMessage(error),
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadVendors, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [search, reloadKey]);

  function openCreateModal() {
    setEditingVendor(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(vendor: VendorRow) {
    setEditingVendor(vendor);
    setForm({
      vendor_code: vendor.vendor_code || "",
      vendor_name: vendor.vendor_name,
      contact_name: vendor.contact_name || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
      is_active: vendor.is_active ?? true,
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setModalOpen(false);
    setEditingVendor(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.vendor_name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    setIsSaving(true);

    try {
      if (editingVendor) {
        await masterDataPageService.updateVendor(
          editingVendor.id,
          toPayload(form),
        );
        toast.success("Vendor updated", form.vendor_name.trim());
      } else {
        await masterDataPageService.createVendor(toPayload(form));
        toast.success("Vendor created", form.vendor_name.trim());
      }

      closeModal();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error("Vendor save failed", getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(vendor: VendorRow) {
    const confirmed = window.confirm(
      `Disable vendor ${vendor.vendor_name}?`,
    );

    if (!confirmed) return;

    try {
      await masterDataPageService.deleteVendor(vendor.id);
      toast.success("Vendor disabled", vendor.vendor_name);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error("Vendor disable failed", getApiErrorMessage(error));
    }
  }

  return (
    <MasterDataShell
      title="Vendors"
      description="Manage suppliers for PO, low-stock reorder, and reporting."
      action={
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add Vendor
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
              placeholder="Search vendor, phone, or email"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Refresh vendors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vendor
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contact
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
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    Loading vendors...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    No vendors found.
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-950">
                        {vendor.vendor_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {vendor.vendor_code || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <p>{vendor.contact_name || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {vendor.phone || vendor.email || "-"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusPill active={vendor.is_active} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(vendor)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          aria-label={`Edit ${vendor.vendor_name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(vendor)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                          aria-label={`Disable ${vendor.vendor_name}`}
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
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingVendor ? "Edit Vendor" : "Add Vendor"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Supplier profile for purchase and reporting.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close vendor form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["Vendor Code", "vendor_code"],
                  ["Vendor Name", "vendor_name"],
                  ["Contact Name", "contact_name"],
                  ["Phone", "phone"],
                  ["Email", "email"],
                ].map(([label, key]) => (
                  <label
                    key={key}
                    className={key === "vendor_name" ? "space-y-2" : "space-y-2"}
                  >
                    <span className="text-sm font-semibold text-slate-700">
                      {label}
                    </span>
                    <input
                      value={String(form[key as keyof VendorFormState])}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      required={key === "vendor_name"}
                    />
                  </label>
                ))}

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
                    Active vendor
                  </span>
                </label>

                <label className="space-y-2 md:col-span-2">
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
                    className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Notes
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
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
                  {isSaving ? "Saving..." : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </MasterDataShell>
  );
}
