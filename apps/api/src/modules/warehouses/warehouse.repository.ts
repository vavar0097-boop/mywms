import { supabase } from "../../config/supabase";

export type WarehouseRow = {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  address: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WarehousePayload = {
  warehouse_code: string;
  warehouse_name: string;
  address?: string | null;
  is_active?: boolean;
};

export class WarehouseRepository {
  async generateWarehouseCode() {
    const { data, error } = await supabase
      .from("warehouses")
      .select("code")
      .ilike("code", "WH-%")
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

    return `WH-${String(nextNumber).padStart(6, "0")}`;
  }

  async findAll(params?: {
    search?: string;
    limit?: number;
  }): Promise<WarehouseRow[]> {
    const search = params?.search?.trim();
    const limit = params?.limit ?? 100;

    let query = supabase
      .from("warehouses")
      .select(`
        id,
        warehouse_code:code,
        warehouse_name:name,
        address,
        is_active,
        created_at,
        updated_at
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

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as WarehouseRow[];
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from("warehouses")
      .select(`
        id,
        warehouse_code:code,
        warehouse_name:name,
        address,
        is_active,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .single();

    if (error) {
      return null;
    }

    return data as WarehouseRow;
  }

  async create(payload: WarehousePayload) {
    const { data, error } = await supabase
      .from("warehouses")
      .insert({
        code: payload.warehouse_code,
        name: payload.warehouse_name,
        address: payload.address ?? null,
        is_active: payload.is_active ?? true,
      })
      .select(`
        id,
        warehouse_code:code,
        warehouse_name:name,
        address,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    return data as WarehouseRow;
  }

  async update(
    id: string,
    payload: Partial<WarehousePayload>,
  ) {
    const updatePayload: Record<string, unknown> = {};

    if (payload.warehouse_code !== undefined) {
      updatePayload.code = payload.warehouse_code;
    }

    if (payload.warehouse_name !== undefined) {
      updatePayload.name = payload.warehouse_name;
    }

    if (payload.address !== undefined) {
      updatePayload.address = payload.address;
    }

    if (payload.is_active !== undefined) {
      updatePayload.is_active = payload.is_active;
    }

    const { data, error } = await supabase
      .from("warehouses")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        id,
        warehouse_code:code,
        warehouse_name:name,
        address,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    return data as WarehouseRow;
  }

  async delete(id: string) {
    const { error } = await supabase
      .from("warehouses")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
