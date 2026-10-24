import { Router } from "express";

import { PERMISSIONS } from "../../../config/permissions";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { permissionMiddleware } from "../../../middleware/role.middleware";

import { PosSaleController } from "../controllers/pos-sale.controller";

const router = Router();
const controller = new PosSaleController();

router.get(
  "/outlets",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.CASHIER_SESSIONS_READ),
  controller.getOutlets,
);

router.get(
  "/menu",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.CASHIER_SESSIONS_READ),
  controller.getMenu,
);

router.post(
  "/sales",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.CASHIER_SESSIONS_WRITE),
  controller.createSale,
);

router.post(
  "/sales/:id/void",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_WRITE),
  controller.voidSale,
);

export default router;
