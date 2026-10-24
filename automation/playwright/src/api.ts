import { expect, request } from "@playwright/test";

import { apiBaseUrl, appUrl, Credentials } from "./env";

export async function createApiContext() {
  return request.newContext({
    baseURL: `${apiBaseUrl.replace(/\/$/, "")}/api/`,
    extraHTTPHeaders: {
      Origin: appUrl,
    },
  });
}

export async function loginApi(credentials: Credentials) {
  const api = await createApiContext();
  const response = await api.post("auth/login", {
    data: credentials,
  });

  expect(response.ok(), await response.text()).toBeTruthy();

  return {
    api,
    cookie: toCookieHeader(response.headers()["set-cookie"]),
  };
}

export function authHeaders(cookie?: string) {
  return cookie ? { Cookie: cookie } : undefined;
}

export function rowsFromPayload<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];

  const body = "data" in payload ? payload.data : payload;

  if (Array.isArray(body)) return body as T[];

  if (body && typeof body === "object" && "data" in body) {
    return Array.isArray(body.data) ? (body.data as T[]) : [];
  }

  return [];
}

function toCookieHeader(setCookie?: string) {
  return setCookie
    ?.split(/\r?\n/)
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
}
