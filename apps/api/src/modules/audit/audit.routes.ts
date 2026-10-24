import { Router } from "express";

import { PERMISSIONS } from "../../config/permissions";
import { asyncHandler } from "../../utils/async-handler";
import { authMiddleware } from "../../middleware/auth.middleware";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { AuditController } from "./audit.controller";

const router = Router();
const controller = new AuditController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.AUDIT_READ),
  asyncHandler(controller.getLogs),
);

export default router;
