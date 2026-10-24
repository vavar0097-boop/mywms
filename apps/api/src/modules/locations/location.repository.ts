import { supabase } from "../../config/supabase";

export type LocationRow = {
  id: string;
  location_code: string;
  location_name: string;
  location_type: string;
  warehouse_id: string | null;
  parent_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export type LocationPayload = {
  location_code?: string;
  location_name: string;
  location_type: string;
  warehouse_id: string;
  parent_id?: string | null;
  is_active?: boolean;
};

export class LocationRepository {
  async generateLocationCode(
    locationType: string,
    warehouseId: string,
  ) {
    const prefixMap: Record<string, string> = {
      ZONE: "ZON",
      AISLE: "AIS",
      RACK: "RCK",
      BIN: "BIN",
      OUTLET: "OUT",
    };
    const prefix = prefixMap[locationType] ?? "LOC";

    const { data, error } = await supabase
      .from("locations")
      .select("code")
      .eq("warehouse_id", warehouseId)
      .ilike("code", `${prefix}-%`)
      .order("code", {
        ascending: false,
      })
      .limit(1000);

    if (error) {
      throw error;
    }

    const nextNumber =
      ((data ?? [])
        .map((row) => {
          const value = String(row.code ?? "");
          const match = value.match(/-(\d+)$/);

          return match ? Number(match[1]) : 0;
        })
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => b - a)[0] ?? 0) + 1;

    return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
  }

  async findAll(params?: {
    search?: string;
    warehouse_id?: string;
    location_type?: string;
    limit?: number;
  }): Promise<LocationRow[]> {
    const search = params?.search?.trim();
    const warehouseId = params?.warehouse_id?.trim();
    const locationType = params?.location_type?.trim();
    const limit = params?.limit ?? 200;

    let query = supabase
      .from("locations")
      .select(`
        id,
        location_code:code,
        location_name:name,
        location_type:level,
        warehouse_id,
        parent_id,
        is_active,
        created_at
      `)
      .eq("is_active", true)
      .order("code", {
        ascending: true,
      })
      .limit(limit);

    if (search) {
      query = query.or(
        `code.ilike.%${search}%,name.ilike.%${search}%`,
      );
    }

    if (warehouseId) {
      query = query.eq("warehouse_id", warehouseId);
    }

    if (locationType) {
      query = query.eq("level", locationType);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as LocationRow[];
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from("locations")
      .select(`
        id,
        location_code:code,
        location_name:name,
        location_type:level,
        warehouse_id,
        parent_id,
        is_active,
        created_at
      `)
      .eq("id", id)
      .single();

    if (error) {
      return null;
    }

    return data as LocationRow;
  }

  async create(payload: LocationPayload) {
    const { data, error } = await supabase
      .from("locations")
      .insert({
        code: payload.location_code,
        name: payload.location_name,
        level: payload.location_type,
        warehouse_id: payload.warehouse_id,
        parent_id: payload.parent_id ?? null,
        is_active: payload.is_active ?? true,
      })
      .select(`
        id,
        location_code:code,
        location_name:name,
        location_type:level,
        warehouse_id,
        parent_id,
        is_active,
        created_at
      `)
      .single();

    if (error) {
      throw error;
    }

    return data as LocationRow;
  }

  async update(
    id: string,
    payload: Partial<LocationPayload>,
  ) {
    const updatePayload: Record<string, unknown> = {};

    if (payload.location_code !== undefined) {
      updatePayload.code = payload.location_code;
    }

    if (payload.location_name !== undefined) {
      updatePayload.name = payload.location_name;
    }

    if (payload.location_type !== undefined) {
      updatePayload.level = payload.location_type;
    }

    if (payload.warehouse_id !== undefined) {
      updatePayload.warehouse_id = payload.warehouse_id;
    }

    if (payload.parent_id !== undefined) {
      updatePayload.parent_id = payload.parent_id;
    }

    if (payload.is_active !== undefined) {
      updatePayload.is_active = payload.is_active;
    }

    const { data, error } = await supabase
      .from("locations")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        id,
        location_code:code,
        location_name:name,
        location_type:level,
        warehouse_id,
        parent_id,
        is_active,
        created_at
      `)
      .single();

    if (error) {
      throw error;
    }

    return data as LocationRow;
  }

  async delete(id: string) {
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
