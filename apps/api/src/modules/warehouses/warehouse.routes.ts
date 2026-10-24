import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { WarehouseController } from "./warehouse.controller";

const router = Router();

const warehouseController = new WarehouseController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.WAREHOUSES_READ),
  warehouseController.getWarehouses.bind(warehouseController),
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.WAREHOUSES_WRITE),
  warehouseController.createWarehouse.bind(warehouseController),
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.WAREHOUSES_WRITE),
  warehouseController.updateWarehouse.bind(warehouseController),
);

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.WAREHOUSES_WRITE),
  warehouseController.deleteWarehouse.bind(warehouseController),
);

export default router;
