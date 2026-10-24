import { LocationRepository } from "./location.repository";
import { supabase } from "../../config/supabase";
import {
  BadRequestError,
  NotFoundError,
  isForeignKeyViolation,
  toDeleteConflictError,
} from "../../utils/errors";

const locationRepository = new LocationRepository();

const locationTypes = new Set([
  "ZONE",
  "AISLE",
  "RACK",
  "BIN",
  "OUTLET",
]);

type LocationPayload = {
  location_code?: string;
  location_name: string;
  location_type: string;
  warehouse_id: string;
  parent_id?: string | null;
  is_active?: boolean;
};

async function assertWarehouseExists(warehouseId: string) {
  const { data } = await supabase
    .from("warehouses")
    .select("id")
    .eq("id", warehouseId)
    .maybeSingle();

  if (!data) {
    throw new BadRequestError("Warehouse not found");
  }
}

async function cleanPayload(
  payload: LocationPayload,
): Promise<LocationPayload> {
  const locationCode = payload.location_code?.trim();
  const locationName = payload.location_name?.trim();
  const locationType = payload.location_type?.trim();
  const warehouseId = payload.warehouse_id?.trim();
  const parentId = payload.parent_id?.trim() || null;

  if (
    !locationName ||
    !locationType ||
    !warehouseId
  ) {
    throw new BadRequestError(
      "Location name, type, and warehouse are required",
    );
  }

  if (!locationTypes.has(locationType)) {
    throw new BadRequestError("Invalid location type");
  }

  await assertWarehouseExists(warehouseId);

  if (parentId) {
    const parent = await locationRepository.findById(parentId);

    if (!parent) {
      throw new BadRequestError("Parent location not found");
    }

    if (parent.warehouse_id !== warehouseId) {
      throw new BadRequestError(
        "Parent location must be in the same warehouse",
      );
    }
  }

  return {
    location_code: locationCode,
    location_name: locationName,
    location_type: locationType,
    warehouse_id: warehouseId,
    parent_id: parentId,
    is_active: payload.is_active ?? true,
  };
}

export class LocationService {
  async getLocations(params?: {
    search?: string;
    warehouse_id?: string;
    location_type?: string;
    limit?: number;
  }) {
    const locations =
      await locationRepository.findAll(params);

    return locations.map((location) => ({
      id: location.id,
      location_code: location.location_code,
      location_name: location.location_name,
      location_type: location.location_type,
      warehouse_id: location.warehouse_id,
      parent_id: location.parent_id,
      is_active: location.is_active ?? true,
      created_at: location.created_at,
    }));
  }

  async createLocation(payload: LocationPayload) {
    const clean = await cleanPayload(payload);
    clean.location_code =
      clean.location_code ||
      await locationRepository.generateLocationCode(
        clean.location_type,
        clean.warehouse_id,
      );

    return locationRepository.create(clean);
  }

  async updateLocation(
    id: string,
    payload: Partial<LocationPayload>,
  ) {
    const existing = await locationRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Location not found");
    }

    const merged = await cleanPayload({
      location_code:
        payload.location_code ?? existing.location_code,
      location_name:
        payload.location_name ?? existing.location_name,
      location_type:
        payload.location_type ?? existing.location_type,
      warehouse_id:
        payload.warehouse_id ?? existing.warehouse_id ?? "",
      parent_id:
        payload.parent_id === undefined
          ? existing.parent_id
          : payload.parent_id,
      is_active:
        payload.is_active ?? existing.is_active ?? true,
    });

    if (merged.parent_id === id) {
      throw new BadRequestError(
        "Location cannot be its own parent",
      );
    }

    return locationRepository.update(id, merged);
  }

  async deleteLocation(id: string) {
    const existing = await locationRepository.findById(id);

    if (!existing) {
      throw new NotFoundError("Location not found");
    }

    try {
      await locationRepository.delete(id);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw toDeleteConflictError(error, "location");
      }

      throw error;
    }
  }
}
