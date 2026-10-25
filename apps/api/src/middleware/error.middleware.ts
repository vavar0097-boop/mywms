import {
  NextFunction,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import { logger } from "../config/logger";
import { AppError } from "../utils/errors";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error("Request failed", {
    error: err,
  });

  if (err instanceof AppError && err.statusCode < 500) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map(({ code, path, message }) => ({
        code,
        path,
        message,
      })),
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
}
