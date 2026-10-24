import { Router } from "express";

import { PERMISSIONS } from "../../../config/permissions";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { permissionMiddleware } from "../../../middleware/role.middleware";
import { PurchaseOrderController } from "../controllers/purchase-order.controller";

const router = Router();
const controller = new PurchaseOrderController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_READ),
  controller.findMany,
);

router.post(
  "/parse-import",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_WRITE),
  controller.parseImport,
);

router.get(
  "/low-stock",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_READ),
  controller.lowStock,
);

router.post(
  "/generate-low-stock",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_WRITE),
  controller.generateLowStock,
);

router.get(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_READ),
  controller.findById,
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_WRITE),
  controller.create,
);

router.post(
  "/:id/order",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_WRITE),
  controller.order,
);

router.post(
  "/:id/receive",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_RECEIVE),
  controller.receive,
);

router.post(
  "/:id/cancel",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.PURCHASE_ORDERS_WRITE),
  controller.cancel,
);

export default router;
