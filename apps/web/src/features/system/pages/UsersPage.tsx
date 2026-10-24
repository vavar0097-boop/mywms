import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import {
  RoleRow,
  UserPayload,
  UserRow,
  masterDataPageService,
} from "@/features/master-data/services/master-data-page.service";
import { getApiErrorMessage } from "@/shared/lib/api/error";
import { StatusPill } from "@/features/master-data/components/StatusPill";
import { toast } from "@/shared/ui/toast";

type UserForm = {
  username: string;
  full_name: string;
  password: string;
  role_id: string;
  is_active: boolean;
};

const emptyForm: UserForm = {
  username: "",
  full_name: "",
  password: "",
  role_id: "",
  is_active: true,
};

function toPayload(
  form: UserForm,
  isEditing: boolean,
): UserPayload {
  return {
    username: form.username.trim(),
    full_name: form.full_name.trim(),
    role_id: form.role_id,
    is_active: form.is_active,
    ...(!isEditing || form.password.trim()
      ? { password: form.password.trim() }
      : {}),
  };
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(
    null,
  );
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadRoles() {
      try {
        const rows = await masterDataPageService.getRoles();

        if (mounted) {
          setRoles(rows);
        }
      } catch (error) {
        if (mounted) {
          toast.error(
            "Roles failed to load",
            getApiErrorMessage(error),
          );
        }
      }
    }

    loadRoles();

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      setIsLoading(true);

      try {
        const rows = await masterDataPageService.getUsers({
          limit: 100,
          ...(search.trim() ? { search: search.trim() } : {}),
        });

        if (!mounted) return;

        setUsers(rows);
      } catch (error) {
        if (!mounted) return;

        toast.error(
          "Users failed to load",
          getApiErrorMessage(error),
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadUsers, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [search, reloadKey]);

  function openCreateModal() {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      role_id: roles[0]?.id || "",
    });
    setModalOpen(true);
  }

  function openEditModal(user: UserRow) {
    setEditingUser(user);
    setForm({
      username: user.username,
      full_name: user.full_name,
      password: "",
      role_id: user.role_id || roles[0]?.id || "",
      is_active: user.is_active ?? true,
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.username.trim() ||
      !form.full_name.trim() ||
      !form.role_id ||
      (!editingUser && !form.password.trim())
    ) {
      toast.error(
        "User form incomplete",
        "Username, full name, role, and password are required.",
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editingUser) {
        await masterDataPageService.updateUser(
          editingUser.id,
          toPayload(form, true),
        );
        toast.success("User updated", form.username.trim());
      } else {
        await masterDataPageService.createUser(
          toPayload(form, false),
        );
        toast.success("User created", form.username.trim());
      }

      closeModal();
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        editingUser
          ? "User update failed"
          : "User creation failed",
        getApiErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: UserRow) {
    const confirmed = window.confirm(
      `Delete user ${user.username}?`,
    );

    if (!confirmed) return;

    setDeletingId(user.id);

    try {
      await masterDataPageService.deleteUser(user.id);
      toast.success("User deleted", user.username);
      setReloadKey((value) => value + 1);
    } catch (error) {
      toast.error(
        "User delete failed",
        getApiErrorMessage(error),
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Users
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, edit, and deactivate WMS users.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add User
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
              placeholder="Search username or full name"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-slate-500">
              {users.length} users
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Refresh users"
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
                  Username
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Full Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
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
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-950">
                      {user.username}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {user.full_name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {user.role_name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusPill active={user.is_active} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          aria-label={`Edit ${user.username}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${user.username}`}
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
                  {editingUser ? "Edit User" : "Add User"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingUser
                    ? "Leave password empty to keep the current password."
                    : "New users need a password and role."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close user form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Username
                  </span>
                  <input
                    value={form.username}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Full Name
                  </span>
                  <input
                    value={form.full_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Password
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required={!editingUser}
                    minLength={editingUser ? undefined : 6}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Role
                  </span>
                  <select
                    value={form.role_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role_id: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    required
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
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
                  Active user
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
                  {isSaving ? "Saving..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
