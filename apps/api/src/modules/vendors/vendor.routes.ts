import { Router } from "express";

import { PERMISSIONS } from "../../config/permissions";
import { authMiddleware } from "../../middleware/auth.middleware";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { VendorController } from "./vendor.controller";

const router = Router();
const controller = new VendorController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.VENDORS_READ),
  controller.getVendors.bind(controller),
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.VENDORS_WRITE),
  controller.createVendor.bind(controller),
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.VENDORS_WRITE),
  controller.updateVendor.bind(controller),
);

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.VENDORS_WRITE),
  controller.deleteVendor.bind(controller),
);

export default router;
