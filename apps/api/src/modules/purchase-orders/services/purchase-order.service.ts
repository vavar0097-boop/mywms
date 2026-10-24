import { BadRequestError, NotFoundError } from "../../../utils/errors";
import { StockRepository } from "../../stocks/repositories/stock.repository";

import {
  CreatePurchaseOrderDto,
  GenerateLowStockPurchaseOrderDto,
  LowStockQueryDto,
  ParsePurchaseOrderImportDto,
  PurchaseOrderActionDto,
  PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
} from "../dto/purchase-order.dto";
import { PurchaseOrderRepository } from "../repositories/purchase-order.repository";

type PurchaseOrderItemRow = {
  id: string;
  item_id: string;
  qty_ordered: number | string;
  qty_received: number | string;
};

type LowStockCandidateRow = {
  item_id: string;
  item_code: string;
  item_name: string;
  min_stock: number | string;
  reorder_qty: number | string;
  current_qty: number | string;
  shortage_qty: number | string;
  suggested_qty: number | string;
  default_vendor_name?: string | null;
};

function numberValue(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function normalizeKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function calculateStatus(items: PurchaseOrderItemRow[]) {
  const totalOrdered = items.reduce(
    (sum, item) => sum + numberValue(item.qty_ordered),
    0,
  );
  const totalReceived = items.reduce(
    (sum, item) => sum + numberValue(item.qty_received),
    0,
  );

  if (totalReceived <= 0) return "ORDERED" as const;
  if (totalReceived >= totalOrdered) return "RECEIVED" as const;

  return "PARTIALLY_RECEIVED" as const;
}

function splitImportLine(line: string) {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");

  return line.split(",");
}

function normalizePurchaseOrder(
  row: Record<string, any>,
): Record<string, any> {
  const destination = row.destination ?? {};
  const vendor = row.vendors ?? {};

  return {
    ...row,
    destination_location_code:
      destination.code ?? destination.location_code ?? null,
    destination_location_name:
      destination.name ?? destination.location_name ?? null,
    vendor_code: vendor.vendor_code ?? null,
    vendor_phone: vendor.phone ?? null,
    vendor_email: vendor.email ?? null,
    purchase_order_items: (row.purchase_order_items ?? []).map(
      (item: Record<string, any>) => ({
        ...item,
        item_code: item.items?.item_code ?? item.item_code ?? null,
        item_name: item.items?.item_name ?? item.item_name ?? null,
      }),
    ),
  };
}

function isNumericCell(value: string | undefined) {
  if (!value) return false;

  return Number.isFinite(Number(value));
}

export class PurchaseOrderService {
  constructor(
    private readonly repository = new PurchaseOrderRepository(),
    private readonly stockRepository = new StockRepository(),
  ) {}

  async findMany(query: PurchaseOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.findMany({
      page,
      limit,
      search: query.search,
      status: query.status,
    });

    return {
      data: (result.data ?? []).map((row) =>
        normalizePurchaseOrder(row as Record<string, any>),
      ),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async findById(id: string) {
    const row = await this.repository.findById(id);

    if (!row) {
      throw new NotFoundError("Purchase order not found");
    }

    return normalizePurchaseOrder(row as Record<string, any>);
  }

  async create(dto: CreatePurchaseOrderDto, userId: string) {
    const seen = new Set<string>();

    for (const item of dto.items) {
      if (seen.has(item.item_id)) {
        throw new BadRequestError("PO item must be unique");
      }

      seen.add(item.item_id);
    }

    const row = await this.repository.create(dto, userId);

    return this.findById(row.id);
  }

  async findLowStockCandidates(query: LowStockQueryDto) {
    const rows = (await this.repository.findLowStockCandidates(
      query.location_id,
    )) as LowStockCandidateRow[];

    return rows.map((row) => ({
      ...row,
      min_stock: numberValue(row.min_stock),
      reorder_qty: numberValue(row.reorder_qty),
      current_qty: numberValue(row.current_qty),
      shortage_qty: numberValue(row.shortage_qty),
      suggested_qty: numberValue(row.suggested_qty),
    }));
  }

  async generateLowStockPurchaseOrder(
    dto: GenerateLowStockPurchaseOrderDto,
    userId: string,
  ) {
    const candidates = await this.findLowStockCandidates({
      location_id: dto.destination_location_id,
    });

    const validCandidates = candidates.filter(
      (candidate) => candidate.suggested_qty > 0,
    );

    if (validCandidates.length === 0) {
      throw new BadRequestError(
        "No low-stock items need purchase order or all are already covered by open PO",
      );
    }

    const vendorName =
      dto.vendor_name?.trim() ||
      validCandidates.find((candidate) =>
        candidate.default_vendor_name?.trim(),
      )?.default_vendor_name ||
      "Auto Low Stock";

    const row = await this.repository.create(
      {
        vendor_name: vendorName,
        vendor_id: dto.vendor_id ?? null,
        order_date: new Date().toISOString().slice(0, 10),
        expected_date: null,
        destination_location_id: dto.destination_location_id,
        notes:
          dto.notes ??
          "Auto-generated from low stock reorder recommendation",
        source_type: "AUTO_LOW_STOCK",
        source_payload: {
          generated_at: new Date().toISOString(),
          candidates: validCandidates,
        },
        items: validCandidates.map((candidate) => ({
          item_id: candidate.item_id,
          qty_ordered: candidate.suggested_qty,
          unit_price: 0,
          notes: `Current ${candidate.current_qty}, minimum ${candidate.min_stock}`,
        })),
      },
      userId,
    );

    return this.findById(row.id);
  }

  async order(id: string, dto: PurchaseOrderActionDto, userId: string) {
    const row = await this.findById(id);

    if (row.status !== "DRAFT") {
      throw new BadRequestError("Only DRAFT PO can be ordered");
    }

    await this.repository.updateStatus({
      id,
      status: "ORDERED",
      payload: {
        ordered_by: userId,
        ordered_at: new Date().toISOString(),
      },
    });
    await this.repository.createEvent(id, "ORDERED", userId, dto.notes);

    return this.findById(id);
  }

  async cancel(id: string, dto: PurchaseOrderActionDto, userId: string) {
    const row = await this.findById(id);

    if (!["DRAFT", "ORDERED"].includes(row.status)) {
      throw new BadRequestError("Purchase order cannot be cancelled");
    }

    await this.repository.updateStatus({
      id,
      status: "CANCELLED",
      payload: {
        cancelled_by: userId,
        cancelled_at: new Date().toISOString(),
      },
    });
    await this.repository.createEvent(id, "CANCELLED", userId, dto.notes);

    return this.findById(id);
  }

  async receive(id: string, dto: ReceivePurchaseOrderDto, userId: string) {
    const row = await this.findById(id);

    if (!["ORDERED", "PARTIALLY_RECEIVED"].includes(row.status)) {
      throw new BadRequestError("Only ordered PO can be received");
    }

    const items = (row.purchase_order_items ?? []) as PurchaseOrderItemRow[];
    const itemById = new Map(items.map((item) => [item.id, item]));
    const receiptItems: Array<{
      purchase_order_item_id: string;
      item_id: string;
      qty_received: number;
    }> = [];

    for (const received of dto.items) {
      const item = itemById.get(received.purchase_order_item_id);

      if (!item) {
        throw new BadRequestError("Received item is not part of this PO");
      }

      const remaining =
        numberValue(item.qty_ordered) - numberValue(item.qty_received);

      if (received.qty_received > remaining) {
        throw new BadRequestError("Received quantity exceeds remaining PO quantity");
      }

      receiptItems.push({
        purchase_order_item_id: item.id,
        item_id: item.item_id,
        qty_received: received.qty_received,
      });
    }

    const receipt = await this.repository.createReceipt({
      purchaseOrderId: id,
      userId,
      dto,
    });

    await this.repository.createReceiptItems({
      receiptId: receipt.id,
      items: receiptItems,
    });

    for (const item of receiptItems) {
      await this.stockRepository.createStockMovement({
        item_id: item.item_id,
        location_id: row.destination_location_id,
        movement_type: "IN",
        quantity: item.qty_received,
        reference_type: "PURCHASE_RECEIVE",
        reference_id: receipt.id,
        reference_no: receipt.receipt_no ?? row.po_no,
        remarks: dto.notes ?? `PO receive ${row.po_no}`,
        created_by: userId,
        stock_effect: "PLUS",
      });

      await this.repository.incrementReceivedQty({
        purchaseOrderItemId: item.purchase_order_item_id,
        qtyReceived: item.qty_received,
      });
    }

    const next = await this.findById(id);
    const status = calculateStatus(
      (next.purchase_order_items ?? []) as PurchaseOrderItemRow[],
    );

    await this.repository.updateStatus({
      id,
      status,
    });
    await this.repository.createEvent(id, "RECEIVED", userId, dto.notes);

    return this.findById(id);
  }

  async parseImport(dto: ParsePurchaseOrderImportDto) {
    const items = await this.repository.findItemsForImport();
    const itemByCode = new Map(
      items.map((item) => [normalizeKey(item.item_code), item]),
    );
    const itemByName = new Map(
      items.map((item) => [normalizeKey(item.item_name), item]),
    );

    const lines = dto.raw_text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const rows = lines
      .map((line) => splitImportLine(line).map((cell) => cell.trim()))
      .filter((cells) => cells.length >= 2)
      .filter((cells, index) => {
        if (index > 0) return true;

        return !/item|kode|code|qty|quantity/i.test(cells.join(" "));
      })
      .map((cells, index) => {
        const hasNameColumn = cells.length >= 3 && !isNumericCell(cells[1]);
        const itemRef = cells[0] ?? "";
        const qty = hasNameColumn ? cells[2] : cells[1];
        const unitPrice = hasNameColumn ? cells[3] : cells[2];
        const notes = hasNameColumn ? cells.slice(4).join(" ") : cells[3];
        const match =
          itemByCode.get(normalizeKey(itemRef)) ||
          itemByName.get(normalizeKey(itemRef)) ||
          itemByName.get(normalizeKey(cells[1]));
        const errors: string[] = [];
        const qtyOrdered = numberValue(qty);
        const unitPriceAmount = numberValue(unitPrice);

        if (!match) {
          errors.push("Item not found in master data");
        }

        if (qtyOrdered <= 0) {
          errors.push("Quantity must be greater than 0");
        }

        return {
          row_number: index + 1,
          item_ref: itemRef,
          item_id: match?.id ?? null,
          item_code: match?.item_code ?? null,
          item_name: match?.item_name ?? (hasNameColumn ? cells[1] : itemRef),
          qty_ordered: qtyOrdered,
          unit_price: unitPriceAmount,
          notes: notes || null,
          matched: Boolean(match) && qtyOrdered > 0,
          errors,
        };
      });

    return {
      rows,
      matched_count: rows.filter((row) => row.matched).length,
      error_count: rows.filter((row) => row.errors.length > 0).length,
    };
  }
}
