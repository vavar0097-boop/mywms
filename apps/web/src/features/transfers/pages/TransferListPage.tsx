import { Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { formatDateTime, formatText } from "@/lib/utils";
import { getApiErrorMessage } from "@/shared/lib/api/error";
import { Button } from "@/shared/ui/button/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card/card";
import { toast } from "@/shared/ui/toast";

import { TransferStatusBadge } from "../components/TransferStatusBadge";
import { useTransferStore } from "../stores/transfer.store";

export function TransferListPage() {
  const [query, setQuery] = useState("");

  const {
    transfers,
    loadingList,
    fetchTransfers,
  } = useTransferStore();

  useEffect(() => {
    fetchTransfers().catch((error) => {
      toast.error(
        "Failed to load transfers",
        getApiErrorMessage(error),
      );
    });
  }, [fetchTransfers]);

  const totalDraft = transfers.filter(
    (transfer) => transfer.status === "DRAFT",
  ).length;

  const totalActive = transfers.filter((transfer) =>
    ["REQUESTED", "PICKED", "IN_TRANSIT"].includes(
      transfer.status,
    ),
  ).length;

  const totalCompleted = transfers.filter(
    (transfer) => transfer.status === "RECEIVED",
  ).length;

  const filteredTransfers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return transfers;

    return transfers.filter((transfer) =>
      [
        transfer.transfer_no,
        transfer.status,
        transfer.source_location_code,
        transfer.source_location_name,
        transfer.destination_location_code,
        transfer.destination_location_name,
        transfer.source_warehouse_code,
        transfer.destination_warehouse_code,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedQuery),
        ),
    );
  }, [query, transfers]);

  async function handleRefresh() {
    try {
      await fetchTransfers();
      toast.success("Transfer list refreshed");
    } catch (error) {
      toast.error(
        "Failed to refresh transfers",
        getApiErrorMessage(error),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Inventory Movement
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Stock Transfers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, request, pick, dispatch, and receive warehouse transfers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loadingList}
          >
            <RefreshCw size={16} />
            {loadingList ? "Refreshing..." : "Refresh"}
          </Button>

          <Link
            to="/dashboard/transfers/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-950 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus size={16} />
            New Transfer
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Draft</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {totalDraft}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Active</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {totalActive}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Received</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {totalCompleted}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle>Transfer List</CardTitle>
              <CardDescription>
                {filteredTransfers.length} of {transfers.length} transfer
                {transfers.length === 1 ? "" : "s"} shown.
              </CardDescription>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                placeholder="Search transfers"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Transfer No
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    Source Location
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    Destination Location
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    Created At
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loadingList ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Loading transfers...
                    </td>
                  </tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No transfer found.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((transfer) => (
                    <tr
                      key={transfer.id}
                      className="bg-white transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-medium text-slate-950">
                        {formatText(transfer.transfer_no)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatText(
                          transfer.source_location_code ||
                            transfer.source_location_name,
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatText(
                          transfer.destination_location_code ||
                            transfer.destination_location_name,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <TransferStatusBadge
                          status={transfer.status}
                        />
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDateTime(transfer.created_at)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/dashboard/transfers/${transfer.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
