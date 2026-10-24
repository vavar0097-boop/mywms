import { supabase } from "../../config/supabase";

export type UnitRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
};

export class UnitRepository {
  async seedDefaults() {
    const { error } = await supabase
      .from("units")
      .upsert(
        [
          {
            code: "PCS",
            name: "Pieces",
          },
          {
            code: "BOX",
            name: "Box",
          },
          {
            code: "DUS",
            name: "Dus",
          },
          {
            code: "KG",
            name: "Kilogram",
          },
          {
            code: "GRAM",
            name: "Gram",
          },
          {
            code: "LITER",
            name: "Liter",
          },
          {
            code: "ML",
            name: "Milliliter",
          },
        ],
        {
          onConflict: "code",
        }
      );

    if (error) {
      throw error;
    }
  }

  async findAll(params?: {
    search?: string;
    limit?: number;
  }): Promise<UnitRow[]> {
    const search = params?.search?.trim();
    const limit = params?.limit ?? 100;

    let query = supabase
      .from("units")
      .select(`
        id,
        code,
        name,
        description,
        is_active
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

    return (data ?? []) as UnitRow[];
  }
}
