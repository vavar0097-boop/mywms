import { Router } from "express";

import {
  authMiddleware,
} from "../../../middleware/auth.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { permissionMiddleware } from "../../../middleware/role.middleware";

import { ItemController }
  from "../controllers/item.controller";

const router = Router();

const controller =
  new ItemController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.ITEMS_READ),
  controller.getAll
);

router.get(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.ITEMS_READ),
  controller.getById
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.ITEMS_WRITE),
  controller.create
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.ITEMS_WRITE),
  controller.update
);

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.ITEMS_WRITE),
  controller.delete
);

export default router;
