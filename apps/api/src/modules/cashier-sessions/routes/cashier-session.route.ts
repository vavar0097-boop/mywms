import { Router } from "express";

import {
  authMiddleware,
} from "../../../middleware/auth.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import {
  permissionMiddleware,
} from "../../../middleware/role.middleware";

import {
  CashierSessionController,
} from "../controllers/cashier-session.controller";

const router = Router();

const controller =
  new CashierSessionController();

router.get(
  "/active",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.CASHIER_SESSIONS_READ),
  controller.getActive
);

router.post(
  "/open",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.CASHIER_SESSIONS_WRITE),
  controller.open
);

router.post(
  "/expenses",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.CASHIER_SESSIONS_WRITE),
  controller.createExpense
);

router.post(
  "/deposits",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.CASHIER_SESSIONS_WRITE),
  controller.createDeposit
);

router.post(
  "/:id/close",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.CASHIER_SESSIONS_WRITE),
  controller.close
);

export default router;
