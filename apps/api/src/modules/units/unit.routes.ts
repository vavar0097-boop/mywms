import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { UnitController } from "./unit.controller";

const router = Router();

const unitController = new UnitController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.ITEMS_READ),
  unitController.getUnits.bind(unitController),
);

export default router;
