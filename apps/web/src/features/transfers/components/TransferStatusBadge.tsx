import { Badge } from "@/shared/ui/badge";

import type { TransferStatus } from "../types/transfer.types";

type Props = {
  status: TransferStatus;
};

const statusVariantMap: Record<
  TransferStatus,
  "slate" | "blue" | "yellow" | "purple" | "green" | "red"
> = {
  DRAFT: "slate",
  REQUESTED: "blue",
  PICKED: "yellow",
  IN_TRANSIT: "purple",
  RECEIVED: "green",
  CANCELLED: "red",
};

export function TransferStatusBadge({ status }: Props) {
  return (
    <Badge variant={statusVariantMap[status] || "slate"}>
      {status}
    </Badge>
  );
}
