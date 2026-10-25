import { supabase } from "../../config/supabase";

export type UserRow = {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean | null;
  is_deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  user_roles?: {
    roles?: {
      id?: string | null;
      name?: string | null;
    } | {
      id?: string | null;
      name?: string | null;
    }[] | null;
  }[];
};

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
};

export class UserRepository {
  async findAll(params?: {
    search?: string;
    limit?: number;
  }) {
    const search = params?.search?.trim();
    const limit = params?.limit ?? 100;

    let query = supabase
      .from("users")
      .select(`
        id,
        username,
        full_name,
        is_active,
        is_deleted,
        created_at,
        updated_at,
        user_roles (
          roles (
            id,
            name
          )
        )
      `)
      .eq("is_deleted", false)
      .order("username", {
        ascending: true,
      })
      .limit(limit);

    if (search) {
      query = query.or(
        `username.ilike.%${search}%,full_name.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as UserRow[];
  }

  async findById(id: string) {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        username,
        full_name,
        is_active,
        is_deleted,
        created_at,
        updated_at,
        user_roles (
          roles (
            id,
            name
          )
        )
      `)
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) {
      return null;
    }

    return data as UserRow;
  }

  async findRoleById(id: string) {
    const { data, error } = await supabase
      .from("roles")
      .select("id, name, description")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as RoleRow | null;
  }

  async findRoles() {
    const { data, error } = await supabase
      .from("roles")
      .select("id, name, description")
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as RoleRow[];
  }

  async upsertRoles(
    roles: {
      name: string;
      description: string;
    }[],
  ) {
    const { error } = await supabase
      .from("roles")
      .upsert(roles, {
        onConflict: "name",
      });

    if (error) {
      throw error;
    }
  }

  async create(payload: {
    username: string;
    full_name: string;
    password_hash: string;
    is_active: boolean;
  }) {
    const { data, error } = await supabase
      .from("users")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return data as {
      id: string;
    };
  }

  async update(
    id: string,
    payload: {
      username?: string;
      full_name?: string;
      password_hash?: string;
      is_active?: boolean;
    },
  ) {
    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .eq("is_deleted", false);

    if (error) {
      throw error;
    }
  }

  async setRole(userId: string, roleId: string) {
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      throw deleteError;
    }

    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role_id: roleId,
      });

    if (insertError) {
      throw insertError;
    }
  }

  async softDelete(id: string) {
    const { error } = await supabase
      .from("users")
      .update({
        username: `deleted-${id}`,
        password_hash: "!deleted!",
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_deleted", false);

    if (error) {
      throw error;
    }
  }
}
