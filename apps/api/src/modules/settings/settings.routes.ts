import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { PosMenuController } from "./pos-menu.controller";

const router = Router();
const controller = new PosMenuController();

router.get(
  "/pos-menu",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.SETTINGS_READ),
  controller.getMenuItems.bind(controller),
);
router.get(
  "/pos-menu/:id/bom",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.SETTINGS_READ),
  controller.getBom.bind(controller),
);
router.post(
  "/pos-menu",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.SETTINGS_WRITE),
  controller.createMenuItem.bind(controller),
);
router.put(
  "/pos-menu/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.SETTINGS_WRITE),
  controller.updateMenuItem.bind(controller),
);
router.put(
  "/pos-menu/:id/bom",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.SETTINGS_WRITE),
  controller.replaceBom.bind(controller),
);
router.delete(
  "/pos-menu/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.SETTINGS_WRITE),
  controller.deleteMenuItem.bind(controller),
);

export default router;
