import { db } from "../../database/client";

export type AuditLogFilters = {
  search?: string;
  entity_name?: string;
  action?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
};

export type AuditLogPayload = {
  user_id: string | null;
  action: string;
  entity_name: string;
  entity_id: string | null;
  old_data: unknown | null;
  new_data: unknown | null;
};

export class AuditRepository {
  async findMany(filters: AuditLogFilters) {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 100);

    let query = db
      .from("audit_logs")
      .select(
        `
        *,
        users(
          id,
          username,
          full_name
        )
      `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (filters.entity_name) {
      query = query.eq("entity_name", filters.entity_name);
    }

    if (filters.action) {
      query = query.ilike("action", `%${filters.action}%`);
    }

    if (filters.user_id) {
      query = query.eq("user_id", filters.user_id);
    }

    if (filters.date_from) {
      query = query.gte("created_at", `${filters.date_from}T00:00:00`);
    }

    if (filters.date_to) {
      query = query.lte("created_at", `${filters.date_to}T23:59:59`);
    }

    if (filters.search) {
      const search = filters.search.trim();

      if (search) {
        query = query.or(
          [
            `action.ilike.%${search}%`,
            `entity_name.ilike.%${search}%`,
          ].join(","),
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async create(payload: AuditLogPayload) {
    const { error } = await db
      .from("audit_logs")
      .insert({
        user_id: payload.user_id,
        action: payload.action,
        entity_name: payload.entity_name,
        entity_id: payload.entity_id,
        old_data: payload.old_data,
        new_data: payload.new_data,
      });

    if (error) {
      throw error;
    }
  }
}
