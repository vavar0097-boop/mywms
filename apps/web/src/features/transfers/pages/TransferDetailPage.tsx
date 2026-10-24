import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import {
  formatDateTime,
  formatText,
} from "@/lib/utils";
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

import { TransferActionButtons } from "../components/TransferActionButtons";
import { TransferStatusBadge } from "../components/TransferStatusBadge";
import { useTransferStore } from "../stores/transfer.store";
import type {
  TransferAction,
  TransferEvent,
  TransferItem,
} from "../types/transfer.types";

function itemName(item: TransferItem) {
  return (
    item.item_code ||
    item.item_name ||
    item.name ||
    item.item_id ||
    "-"
  );
}

function itemQtyRequested(item: TransferItem) {
  return (
    item.qty_requested ??
    item.quantity_requested ??
    0
  );
}

function eventTitle(event: TransferEvent) {
  return (
    event.event_type ||
    event.status ||
    "TRANSFER_EVENT"
  );
}

export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    selectedTransfer,
    loadingDetail,
    actionLoading,
    fetchTransfer,
    runAction,
  } = useTransferStore();

  useEffect(() => {
    if (!id) return;

    fetchTransfer(id).catch((error) => {
      toast.error(
        "Failed to load transfer detail",
        getApiErrorMessage(error),
      );
    });
  }, [id, fetchTransfer]);

  async function handleRefresh() {
    if (!id) return;

    try {
      await fetchTransfer(id);
      toast.success("Transfer detail refreshed");
    } catch (error) {
      toast.error(
        "Failed to refresh detail",
        getApiErrorMessage(error),
      );
    }
  }

  async function handleAction(action: TransferAction) {
    if (!id) return;

    try {
      await runAction(id, action);

      toast.success(
        "Transfer updated",
        `Action ${action.toUpperCase()} has been completed.`,
      );
    } catch (error) {
      toast.error(
        "Transfer action failed",
        getApiErrorMessage(error),
      );
    }
  }

  const transfer = selectedTransfer;
  const transferItems =
    transfer?.items || transfer?.transfer_items || [];
  const transferEvents =
    transfer?.events || transfer?.transfer_events || [];

  if (loadingDetail && !transfer) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          Loading transfer detail...
        </CardContent>
      </Card>
    );
  }

  if (!transfer) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          Transfer not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link
            to="/dashboard/transfers"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to transfers
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {formatText(transfer.transfer_no)}
            </h1>

            <TransferStatusBadge status={transfer.status} />
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Transfer detail, items, timeline, and available status actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loadingDetail}
          >
            <RefreshCw size={16} />
            {loadingDetail ? "Refreshing..." : "Refresh"}
          </Button>

          <TransferActionButtons
            status={transfer.status}
            loadingAction={actionLoading}
            onAction={handleAction}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Information</CardTitle>
              <CardDescription>
                Main transfer document information.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <InfoItem
                label="Source Warehouse"
                value={
                  transfer.source_warehouse_code ||
                  transfer.source_warehouse_name ||
                  transfer.source_warehouse_id
                }
              />
              <InfoItem
                label="Destination Warehouse"
                value={
                  transfer.destination_warehouse_code ||
                  transfer.destination_warehouse_name ||
                  transfer.destination_warehouse_id
                }
              />
              <InfoItem
                label="Source Location"
                value={
                  transfer.source_location_code ||
                  transfer.source_location_name ||
                  transfer.source_location_id
                }
              />
              <InfoItem
                label="Destination Location"
                value={
                  transfer.destination_location_code ||
                  transfer.destination_location_name ||
                  transfer.destination_location_id
                }
              />
              <InfoItem
                label="Requested By"
                value={transfer.requested_by}
              />
              <InfoItem
                label="Approved By"
                value={transfer.approved_by}
              />
              <InfoItem
                label="Received By"
                value={transfer.received_by}
              />
              <InfoItem
                label="Created At"
                value={formatDateTime(transfer.created_at)}
              />
              <InfoItem
                label="Requested At"
                value={formatDateTime(transfer.requested_at)}
              />
              <InfoItem
                label="Approved At"
                value={formatDateTime(transfer.approved_at)}
              />
              <InfoItem
                label="Shipped At"
                value={formatDateTime(transfer.shipped_at)}
              />
              <InfoItem
                label="Received At"
                value={formatDateTime(transfer.received_at)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                Requested, picked, and received quantities.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">
                        Item
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Qty Requested
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Qty Picked
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Qty Received
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Unit
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transferItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No transfer item found.
                        </td>
                      </tr>
                    ) : (
                      transferItems.map((item, index) => (
                        <tr key={item.id || `${item.item_id}-${index}`}>
                          <td className="px-5 py-4 font-medium text-slate-950">
                            {itemName(item)}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {itemQtyRequested(item)}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {item.qty_picked ?? "-"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {item.qty_received ?? "-"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {item.unit_code ||
                              item.unit_name ||
                              "-"}
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {formatText(transfer.remarks)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
              <CardDescription>
                Status history from transfer events.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {transferEvents.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No event timeline found.
                </p>
              ) : (
                <div className="space-y-4">
                  {transferEvents.map((event, index) => (
                    <div
                      key={event.id || `${eventTitle(event)}-${index}`}
                      className="relative border-l border-slate-200 pl-4"
                    >
                      <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-950" />

                      <p className="text-sm font-semibold text-slate-950">
                        {eventTitle(event)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(event.created_at)}
                      </p>

                      {event.notes ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {event.notes}
                        </p>
                      ) : null}

                      {event.created_by_name || event.created_by ? (
                        <p className="mt-2 text-xs text-slate-400">
                          By{" "}
                          {event.created_by_name ||
                            event.created_by}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-950">
        {formatText(value)}
      </p>
    </div>
  );
}
