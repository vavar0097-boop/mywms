import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/shared/lib/api/error";
import { toast } from "@/shared/ui/toast";

import {
  AuditLogRow,
  auditLogService,
} from "../services/audit-log.service";

const entityOptions = [
  "",
  "cashier-sessions",
  "finance",
  "items",
  "locations",
  "pos",
  "settings",
  "stocks",
  "transfers",
  "users",
  "warehouses",
];

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getActor(row: AuditLogRow) {
  return (
    row.users?.full_name ||
    row.users?.username ||
    row.user_id ||
    "System"
  );
}

function summarizePayload(value: unknown) {
  if (!value || typeof value !== "object") return "-";

  const input = value as {
    path?: unknown;
    status_code?: unknown;
    request?: unknown;
  };
  const request =
    input.request && typeof input.request === "object"
      ? input.request
      : {};
  const requestKeys = Object.keys(request).slice(0, 4);
  const suffix =
    requestKeys.length > 0 ? `, ${requestKeys.join(", ")}` : "";

  return `${input.path || "-"} (${input.status_code || "-"})${suffix}`;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadLogs() {
      setIsLoading(true);

      try {
        const rows = await auditLogService.getLogs({
          limit: 100,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(entity ? { entity_name: entity } : {}),
        });

        if (mounted) {
          setLogs(rows);
        }
      } catch (error) {
        if (mounted) {
          toast.error("Audit logs failed to load", getApiErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    const timer = window.setTimeout(loadLogs, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [entity, reloadKey, search]);

  const totalByEntity = useMemo(() => {
    const totals = new Map<string, number>();

    for (const row of logs) {
      totals.set(row.entity_name, (totals.get(row.entity_name) ?? 0) + 1);
    }

    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Activity history and operational traceability.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} />
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Loaded Events</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {logs.length}
          </p>
        </div>
        {totalByEntity.map(([name, total]) => (
          <div
            key={name}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="truncate text-sm text-slate-500">{name}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {total}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <ShieldCheck size={17} />
            Operational Events
          </div>
          <div className="grid gap-3 md:grid-cols-[260px_190px]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                placeholder="Search action or module"
              />
            </div>
            <select
              value={entity}
              onChange={(event) => setEntity(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
              {entityOptions.map((value) => (
                <option key={value || "all"} value={value}>
                  {value || "All modules"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold">Actor</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Module</th>
                <th className="px-5 py-3 font-semibold">Entity ID</th>
                <th className="px-5 py-3 font-semibold">Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="bg-white transition hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-950">
                      {getActor(row)}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {row.action}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {row.entity_name}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {row.entity_id || "-"}
                    </td>
                    <td className="max-w-sm truncate px-5 py-4 text-slate-500">
                      {summarizePayload(row.new_data)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
