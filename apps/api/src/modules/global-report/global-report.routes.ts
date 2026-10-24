import { Router } from "express";

import { PERMISSIONS } from "../../config/permissions";
import { authMiddleware } from "../../middleware/auth.middleware";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { GlobalReportController } from "./global-report.controller";

const router = Router();
const controller = new GlobalReportController();

router.post(
  "/generate",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_READ),
  controller.generate.bind(controller),
);

export default router;
