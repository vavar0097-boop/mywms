import { Button } from "@/shared/ui/button/button";

import type {
  TransferAction,
  TransferStatus,
} from "../types/transfer.types";

type Props = {
  status: TransferStatus;
  loadingAction: TransferAction | null;
  onAction: (action: TransferAction) => void;
};

export function TransferActionButtons({
  status,
  loadingAction,
  onAction,
}: Props) {
  const isBusy = Boolean(loadingAction);

  if (status === "DRAFT") {
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
