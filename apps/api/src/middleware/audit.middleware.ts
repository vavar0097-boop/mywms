import { NextFunction, Response } from "express";

import { logger } from "../config/logger";
import { AuthRequest } from "./auth.middleware";
import { AuditRepository } from "../modules/audit/audit.repository";

const repository = new AuditRepository();
const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const uuidPattern =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const sensitiveKeyPattern =
  /password|token|secret|authorization|cookie|key/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[MaxDepth]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : sanitize(item, depth + 1),
    ]),
  );
}

function getEntityName(originalUrl: string) {
  const pathname = originalUrl.split("?")[0] ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const apiIndex = segments.indexOf("api");

  return segments[apiIndex + 1]?.slice(0, 100) || "unknown";
}

function getEntityId(originalUrl: string, responseBody: unknown) {
  const fromUrl = originalUrl.match(uuidPattern)?.[0];

  if (fromUrl) {
    return fromUrl;
  }

  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "data" in responseBody
  ) {
    const data = (responseBody as { data?: unknown }).data;

    if (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      typeof (data as { id?: unknown }).id === "string"
    ) {
      return (data as { id: string }).id.match(uuidPattern)?.[0] ?? null;
    }
  }

  return null;
}

function shouldAudit(req: AuthRequest) {
  if (!mutatingMethods.has(req.method)) {
    return false;
  }

  if (!req.originalUrl.startsWith("/api/")) {
    return false;
  }

  if (
    req.originalUrl.startsWith("/api/auth") ||
    req.originalUrl.startsWith("/api/audit-logs")
  ) {
    return false;
  }

  return true;
}

export function auditMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!shouldAudit(req)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  let responseBody: unknown;

  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as Response["json"];

  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return;
    }

    const entityName = getEntityName(req.originalUrl);
    const action = `${req.method} ${entityName}`.slice(0, 100);

    repository
      .create({
        user_id: req.user?.id ?? null,
        action,
        entity_name: entityName,
        entity_id: getEntityId(req.originalUrl, responseBody),
        old_data: null,
        new_data: {
          path: req.originalUrl,
          status_code: res.statusCode,
          request: sanitize(req.body),
          response: sanitize(responseBody),
        },
      })
      .catch((error) => {
        logger.warn("Audit log write failed", {
          error,
        });
      });
  });

  next();
}
