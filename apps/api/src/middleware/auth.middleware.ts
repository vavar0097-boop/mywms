import {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";

import { env } from "../config/env";

import {
  UnauthorizedError,
} from "../utils/errors";

export interface AuthRequest
  extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const token =
    req.cookies?.access_token;

  if (!token) {
    throw new UnauthorizedError(
      "Access token missing"
    );
  }

  try {
    const payload =
      jwt.verify(
        token,
        env.JWT_ACCESS_SECRET
      ) as {
        sub?: unknown;
        username?: unknown;
        role?: unknown;
      };

    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string"
    ) {
      throw new UnauthorizedError(
        "Invalid token"
      );
    }

    req.user = {
      id: payload.sub,
      username:
        payload.username,
      role: payload.role,
    };

    next();
  } catch {
    throw new UnauthorizedError(
      "Invalid token"
    );
  }
}
