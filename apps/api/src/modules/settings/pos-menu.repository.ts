import { supabase } from "../../config/supabase";

export type PosMenuPayload = {
  item_id?: string | null;
  menu_code: string;
  menu_name: string;
  category?: string | null;
  price: number;
  is_visible?: boolean;
  is_available?: boolean;
  sort_order?: number;
};

export type PosMenuBomComponentPayload = {
  component_item_id: string;
  quantity_per_menu: number;
  tolerance_percent?: number;
  is_fixed_quantity?: boolean;
  notes?: string | null;
};

export class PosMenuRepository {
  async findAll(params?: {
    search?: string;
    visible_only?: boolean;
    limit?: number;
  }) {
    const search = params?.search?.trim();
    const limit = params?.limit ?? 200;

    let query = supabase
      .from("pos_menu_items")
      .select(`
        *,
        items (
          id,
          item_code,
          item_name
        ),
        bom_components:pos_menu_item_bom_components (
          id,
          component_item_id,
          quantity_per_menu,
          tolerance_percent,
          is_fixed_quantity,
          notes,
          component_item:component_item_id (
            id,
            item_code,
            item_name
          )
        )
      `)
      .order("sort_order", {
        ascending: true,
      })
      .order("menu_name", {
        ascending: true,
      })
      .limit(limit);

    if (params?.visible_only) {
      query = query.eq("is_visible", true);
    }

    if (search) {
      query = query.or(
        `menu_code.ilike.%${search}%,menu_name.ilike.%${search}%,category.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return data ?? [];
  }

  async create(payload: PosMenuPayload) {
    const { data, error } = await supabase
      .from("pos_menu_items")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async update(id: string, payload: Partial<PosMenuPayload>) {
    const { data, error } = await supabase
      .from("pos_menu_items")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async delete(id: string) {
    const { error } = await supabase
      .from("pos_menu_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async findBom(menuItemId: string) {
    const { data, error } = await supabase
      .from("pos_menu_item_bom_components")
      .select(`
        id,
        menu_item_id,
        component_item_id,
        quantity_per_menu,
        tolerance_percent,
        is_fixed_quantity,
        notes,
        component_item:component_item_id (
          id,
          item_code,
          item_name
        )
      `)
      .eq("menu_item_id", menuItemId)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return data ?? [];
  }

  async replaceBom(
    menuItemId: string,
    components: PosMenuBomComponentPayload[],
  ) {
    const { error: deleteError } = await supabase
      .from("pos_menu_item_bom_components")
      .delete()
      .eq("menu_item_id", menuItemId);

    if (deleteError) throw deleteError;

    if (components.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("pos_menu_item_bom_components")
      .insert(
        components.map((component) => ({
          menu_item_id: menuItemId,
          component_item_id: component.component_item_id,
          quantity_per_menu: component.quantity_per_menu,
          tolerance_percent: component.is_fixed_quantity
            ? 0
            : component.tolerance_percent ?? 3,
          is_fixed_quantity: component.is_fixed_quantity ?? false,
          notes: component.notes ?? null,
        })),
      )
      .select(`
        id,
        menu_item_id,
        component_item_id,
        quantity_per_menu,
        tolerance_percent,
        is_fixed_quantity,
        notes,
        component_item:component_item_id (
          id,
          item_code,
          item_name
        )
      `);

    if (error) throw error;

    return data ?? [];
  }
}
