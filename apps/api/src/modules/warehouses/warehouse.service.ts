import { WarehouseRepository } from "./warehouse.repository";
import {
  BadRequestError,
  NotFoundError,
  isForeignKeyViolation,
  toDeleteConflictError,
} from "../../utils/errors";

const warehouseRepository = new WarehouseRepository();

type WarehousePayload = {
  warehouse_code?: string;
  warehouse_name: string;
  address?: string | null;
  is_active?: boolean;
};

async function cleanPayload(payload: WarehousePayload) {
  const warehouseCode = payload.warehouse_code?.trim();
  const warehouseName = payload.warehouse_name?.trim();

  if (!warehouseName) {
    throw new BadRequestError(
      "Warehouse name is required",
    );
  }

  return {
    warehouse_code:
      warehouseCode ||
      await warehouseRepository.generateWarehouseCode(),
    warehouse_name: warehouseName,
    address: payload.address?.trim() || null,
    is_active: payload.is_active ?? true,
  };
}

export class WarehouseService {
  async getWarehouses(params?: {
    search?: string;
    limit?: number;
  }) {
    const warehouses =
      await warehouseRepository.findAll(params);

    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      warehouse_code: warehouse.warehouse_code,
      warehouse_name: warehouse.warehouse_name,
      address: warehouse.address,
      is_active: warehouse.is_active ?? true,
      created_at: warehouse.created_at,
      updated_at: warehouse.updated_at,
    }));
  }

  async createWarehouse(payload: WarehousePayload) {
    return warehouseRepository.create(
      await cleanPayload(payload)
    );
  }

  async updateWarehouse(
    id: string,
    payload: Partial<WarehousePayload>,
  ) {
    const existing = await warehouseRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Warehouse not found");
    }

    return warehouseRepository.update(id, {
      ...(payload.warehouse_code !== undefined
        ? { warehouse_code: payload.warehouse_code.trim() }
        : {}),
      ...(payload.warehouse_name !== undefined
        ? { warehouse_name: payload.warehouse_name.trim() }
        : {}),
      ...(payload.address !== undefined
        ? { address: payload.address?.trim() || null }
        : {}),
      ...(payload.is_active !== undefined
        ? { is_active: payload.is_active }
        : {}),
    });
  }

  async deleteWarehouse(id: string) {
    const existing = await warehouseRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Warehouse not found");
    }

    try {
      await warehouseRepository.delete(id);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw toDeleteConflictError(error, "warehouse");
      }

      throw error;
    }
  }
}
