import { db } from "../../database/client";

export type VendorPayload = {
  vendor_code?: string;
  vendor_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export class VendorRepository {
  async findAll(params?: {
    search?: string;
    limit?: number;
  }) {
    let query = db
      .from("vendors")
      .select("*")
      .order("vendor_name", {
        ascending: true,
      })
      .limit(params?.limit ?? 200);

    if (params?.search?.trim()) {
      const search = params.search.trim();
      query = query.or(
        `vendor_code.ilike.%${search}%,vendor_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async findById(id: string) {
    const { data, error } = await db
      .from("vendors")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async create(payload: VendorPayload) {
    const { data, error } = await db
      .from("vendors")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async update(id: string, payload: Partial<VendorPayload>) {
    const { data, error } = await db
      .from("vendors")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async delete(id: string) {
    const { error } = await db
      .from("vendors")
      .update({
        is_active: false,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
