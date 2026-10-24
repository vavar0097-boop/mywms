import {
  NextFunction,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import { logger } from "../config/logger";
import { AppError } from "../utils/errors";

type ErrorObject = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

function isErrorObject(
  err: unknown,
): err is ErrorObject {
  return typeof err === "object" && err !== null;
}

function getStringValue(
  value: unknown,
): string | undefined {
  return typeof value === "string" && value.trim()
    ? value
    : undefined;
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error("Request failed", {
    error: err,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues,
    });
  }

  if (err instanceof Error) {
    return res.status(500).json({
      success: false,
      message:
        err.message || "Internal Server Error",
    });
  }

  if (isErrorObject(err)) {
    const message =
      getStringValue(err.message) ||
      "Internal Server Error";

    const code = getStringValue(err.code);
    const details = getStringValue(err.details);
    const hint = getStringValue(err.hint);

    return res.status(500).json({
      success: false,
      message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
      ...(hint ? { hint } : {}),
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
}
