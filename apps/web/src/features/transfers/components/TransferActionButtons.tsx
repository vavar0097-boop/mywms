import { Button } from "@/shared/ui/button/button";

import type {
  TransferAction,
  TransferStatus,
} from "../types/transfer.types";

type Props = {
  status: TransferStatus;
  loadingAction: TransferAction | null;
  onAction: (action: TransferAction) => void;
  canManage: boolean;
  canReceive: boolean;
};

export function TransferActionButtons({
  status,
  loadingAction,
  onAction,
  canManage,
  canReceive,
}: Props) {
  const isBusy = Boolean(loadingAction);

  if (status === "DRAFT") {
    if (!canManage) return <TransferWaitingMessage message="Menunggu gudang mengajukan transfer." />;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isBusy}
          onClick={() => onAction("request")}
        >
          {loadingAction === "request"
            ? "Requesting..."
            : "Request"}
        </Button>

        <Button
          variant="danger"
          disabled={isBusy}
          onClick={() => onAction("cancel")}
        >
          {loadingAction === "cancel"
            ? "Cancelling..."
            : "Cancel"}
        </Button>
      </div>
    );
  }

  if (status === "REQUESTED") {
    if (!canManage) return <TransferWaitingMessage message="Menunggu petugas gudang mengambil barang." />;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isBusy}
          onClick={() => onAction("pick")}
        >
          {loadingAction === "pick" ? "Picking..." : "Pick"}
        </Button>

        <Button
          variant="danger"
          disabled={isBusy}
          onClick={() => onAction("cancel")}
        >
          {loadingAction === "cancel"
            ? "Cancelling..."
            : "Cancel"}
        </Button>
      </div>
    );
  }

  if (status === "PICKED") {
    if (!canManage) return <TransferWaitingMessage message="Barang sudah dipilih. Menunggu pengiriman dari gudang." />;

    return (
      <Button
        disabled={isBusy}
        onClick={() => onAction("dispatch")}
      >
        {loadingAction === "dispatch"
          ? "Dispatching..."
          : "Dispatch"}
      </Button>
    );
  }

  if (status === "IN_TRANSIT") {
    if (!canReceive) return <TransferWaitingMessage message="Barang sedang dikirim ke lokasi tujuan." />;

    return (
      <Button
        disabled={isBusy}
        onClick={() => onAction("receive")}
      >
        {loadingAction === "receive"
          ? "Receiving..."
          : "Receive"}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      disabled
    >
      Locked / no action
    </Button>
  );
}

function TransferWaitingMessage({ message }: { message: string }) {
  return (
    <p className="max-w-xs rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
      {message}
    </p>
  );
}
