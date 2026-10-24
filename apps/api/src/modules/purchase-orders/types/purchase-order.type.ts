export type PurchaseOrderStatus =
  | "DRAFT"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type PurchaseOrderSourceType =
  | "MANUAL"
  | "SPREADSHEET"
  | "AI_PHOTO"
  | "AUTO_LOW_STOCK";
