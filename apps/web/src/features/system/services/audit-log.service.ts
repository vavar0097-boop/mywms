import { apiClient } from "@/shared/lib/api/client";

type UnknownRecord = Record<string, unknown>;

export type AuditLogRow = {
  id: string;
  user_id?: string | null;
  action: string;
  entity_name: string;
  entity_id?: string | null;
  old_data?: unknown;
  new_data?: unknown;
  created_at: string;
  users?: {
    id?: string | null;
    username?: string | null;
    full_name?: string | null;
  } | null;
};

export type AuditLogQuery = {
  search?: string;
  entity_name?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function unwrap(payload: unknown) {
  return isRecord(payload) && "data" in payload
    ? payload.data
    : payload;
}

function normalizeArray<T>(payload: unknown): T[] {
  const body = unwrap(payload);

  if (Array.isArray(body)) {
    return body as T[];
  }

  if (!isRecord(body)) {
    return [];
  }

  for (const key of ["data", "items", "rows", "results"]) {
    const value = body[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

export const auditLogService = {
  async getLogs(query: AuditLogQuery = {}) {
    const response = await apiClient.get("/audit-logs", {
      params: {
        limit: query.limit ?? 100,
        ...(query.search ? { search: query.search } : {}),
        ...(query.entity_name ? { entity_name: query.entity_name } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.date_from ? { date_from: query.date_from } : {}),
        ...(query.date_to ? { date_to: query.date_to } : {}),
      },
    });

    return normalizeArray<AuditLogRow>(response.data);
  },
};
