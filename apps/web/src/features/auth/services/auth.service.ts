import { apiClient } from "@/shared/lib/api/client";

export type LoginPayload = {
  username: string;
  password: string;
};

export type AuthUser = {
  id: string;
  username?: string | null;
  email?: string | null;
  name?: string | null;
  full_name?: string | null;
  role?: string | null;
};

function unwrapApiPayload<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

function normalizeUser(payload: unknown): AuthUser | null {
  const unwrapped = unwrapApiPayload<unknown>(payload);

  if (!unwrapped || typeof unwrapped !== "object") {
    return null;
  }

  const value = unwrapped as {
    user?: AuthUser;
    data?: AuthUser;
    id?: string;
    username?: string | null;
    email?: string | null;
    name?: string | null;
    full_name?: string | null;
    role?: string | null;
  };

  if (value.user) return value.user;
  if (value.data?.id) return value.data;

  if (value.id) {
    return {
      id: value.id,
      username: value.username,
      email: value.email,
      name: value.name,
      full_name: value.full_name,
      role: value.role,
    };
  }

  return null;
}

export const authService = {
  async login(payload: LoginPayload) {
    const response = await apiClient.post("/auth/login", {
      username: payload.username.trim(),
      password: payload.password,
    });

    return normalizeUser(response.data);
  },

  async me() {
    const response = await apiClient.get("/auth/me");

    return normalizeUser(response.data);
  },

  async logout() {
    await apiClient.post("/auth/logout");
  },
};