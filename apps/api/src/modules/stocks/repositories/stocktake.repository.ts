import { supabase } from "../../../config/supabase";

export class StocktakeRepository {
  async findMany(limit = 50) {
    const { data, error } = await supabase
      .from("stocktakes")
      .select("id,stocktake_no,location_id,status,created_at,completed_at,locations(code,name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from("stocktakes")
      .select(`id,stocktake_no,location_id,status,created_by,completed_by,created_at,completed_at,locations(code,name),stocktake_items(id,item_id,item_code_snapshot,item_name_snapshot,expected_quantity,counted_quantity)`)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async create(locationId: string, userId: string) {
    const { data, error } = await supabase.rpc("create_stocktake", {
      p_location_id: locationId,
      p_created_by: userId,
    });
    if (error) throw error;
    return this.findById(String(data));
  }

  async complete(id: string, userId: string, counts: Array<{
    item_id: string;
    counted_quantity: number;
  }>) {
    const { error } = await supabase.rpc("complete_stocktake", {
      p_stocktake_id: id,
      p_completed_by: userId,
      p_counts: counts,
    });
    if (error) throw error;
    return this.findById(id);
  }
}
