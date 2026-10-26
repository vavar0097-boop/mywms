import { Router } from "express";

import { authMiddleware } from "../../../middleware/auth.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { permissionMiddleware } from "../../../middleware/role.middleware";

import { TransferController } from "../controllers/transfer.controller";

const router = Router();

const controller =
  new TransferController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.TRANSFERS_READ),
  controller.findMany
);

router.get(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.TRANSFERS_READ),
  controller.findById
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.TRANSFERS_WRITE),
  controller.create
);

router.post(
  "/:id/request",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.TRANSFERS_ACTION),
  controller.request
);

router.post(
  "/:id/pick",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.TRANSFERS_ACTION),
  controller.pick
);

router.post(
  "/:id/dispatch",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.TRANSFERS_ACTION),
  controller.dispatch
);

router.post(
  "/:id/receive",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.TRANSFERS_RECEIVE),
  controller.receive
);

router.post(
  "/:id/cancel",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.TRANSFERS_ACTION),
  controller.cancel
);

export default router;
