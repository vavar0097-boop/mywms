import { NextFunction, Response } from "express";

import {
  Permission,
  roleHasPermission,
} from "../config/permissions";
import { ForbiddenError } from "../utils/errors";
import { AuthRequest } from "./auth.middleware";

export function roleMiddleware(...allowedRoles: string[]) {
  return (
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
  ) => {
    const role = req.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      throw new ForbiddenError("Access denied");
    }

    next();
  };
}

export function permissionMiddleware(...permissions: Permission[]) {
  return (
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
  ) => {
    const role = req.user?.role;

    if (!role || !permissions.some((permission) => roleHasPermission(role, permission))) {
      throw new ForbiddenError("Access denied");
    }

    next();
  };
}
