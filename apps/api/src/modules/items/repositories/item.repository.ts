import { db } from "../../../database/client";

import { CreateItemDto } from "../dto/create-item.dto";
import { UpdateItemDto } from "../dto/update-item.dto";

export class ItemRepository {
  async generateItemCode(
    prefix: string
  ): Promise<string> {
    const normalizedPrefix = prefix.toUpperCase();

    try {
      const { data, error } = await db.rpc(
        "generate_item_code",
        {
          p_prefix: normalizedPrefix,
        }
      );

      if (error) {
        throw error;
      }

      return data as string;
    } catch {
      const { data, error } = await db
        .from("items")
        .select("item_code")
        .ilike("item_code", `${normalizedPrefix}-%`)
        .order("item_code", {
          ascending: false,
        })
        .limit(1000);

      if (error) {
        throw error;
      }

      const nextNumber =
        ((data ?? [])
          .map((row) => {
            const value = String(row.item_code ?? "");
            const match = value.match(/-(\d+)$/);

            return match ? Number(match[1]) : 0;
          })
          .filter((value) => Number.isFinite(value))
          .sort((a, b) => b - a)[0] ?? 0) + 1;

      return `${normalizedPrefix}-${String(nextNumber).padStart(6, "0")}`;
    }
  }

  async findUnitById(
    unitId: string
  ) {
    const { data } = await db
      .from("units")
      .select("*")
      .eq("id", unitId)
      .eq("is_active", true)
      .single();

    return data;
  }

  async findById(
    id: string
  ) {
    const { data } = await db
      .from("items")
      .select(`
        *,
        units(
          id,
          code,
          name
        )
      `)
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    return data;
  }

  async findByBarcode(
    barcode: string
  ) {
    const { data } = await db
      .from("items")
      .select("*")
      .eq("barcode", barcode)
      .eq("is_deleted", false)
      .maybeSingle();

    return data;
  }

  async create(
    payload: {
      item_code: string;
      item_code_prefix: string;
      dto: CreateItemDto;
    }
  ) {
    const { data, error } = await db
      .from("items")
      .insert({
        item_code: payload.item_code,
        item_code_prefix:
          payload.item_code_prefix,

        item_name:
          payload.dto.item_name,

        item_type:
          payload.dto.item_type,

        base_unit_id:
          payload.dto.base_unit_id,

        barcode:
          payload.dto.barcode ?? null,

        description:
          payload.dto.description ?? null,

        min_stock:
          payload.dto.min_stock ?? 0,

        reorder_qty:
          payload.dto.reorder_qty ?? 0,

        default_vendor_name:
          payload.dto.default_vendor_name ?? null,

        default_vendor_id:
          payload.dto.default_vendor_id ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async update(
    id: string,
    dto: UpdateItemDto
  ) {
    const { data, error } = await db
      .from("items")
      .update(dto)
      .eq("id", id)
      .eq("is_deleted", false)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async softDelete(
    id: string
  ) {
    const { error } = await db
      .from("items")
      .update({
        is_deleted: true,
        deleted_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  async findMany(
    page: number,
    limit: number,
    search?: string
  ) {
    let query = db
      .from("items")
      .select(
        `
        *,
        units(
          id,
          code,
          name
        )
      `,
        {
          count: "exact",
        }
      )
      .eq("is_deleted", false);

    if (search) {
      query = query.or(
        [
          `item_code.ilike.%${search}%`,
          `item_name.ilike.%${search}%`,
          `barcode.ilike.%${search}%`,
        ].join(",")
      );
    }

    const from =
      (page - 1) * limit;

    const to =
      from + limit - 1;

    const {
      data,
      count,
      error,
    } = await query.range(
      from,
      to
    );

    if (error) {
      throw error;
    }

    return {
      data,
      total: count ?? 0,
    };
  }
}
