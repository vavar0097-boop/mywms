import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { FinanceController } from "./finance.controller";

const router = Router();
const controller = new FinanceController();

router.get(
  "/transactions",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_READ),
  controller.getTransactions.bind(controller),
);
router.get(
  "/summary",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_READ),
  controller.getSummary.bind(controller),
);
router.get(
  "/cashier-settlements",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_READ),
  controller.getCashierSettlements.bind(controller),
);
router.get(
  "/pos-sales",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_READ),
  controller.getPosSales.bind(controller),
);
router.get(
  "/daily-purchases",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_READ),
  controller.getDailyPurchases.bind(controller),
);
router.post(
  "/daily-purchases/parse",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_WRITE),
  controller.parseDailyPurchase.bind(controller),
);
router.post(
  "/daily-purchases",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_WRITE),
  controller.createDailyPurchase.bind(controller),
);
router.put(
  "/daily-purchases/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_WRITE),
  controller.updateDailyPurchase.bind(controller),
);
router.post(
  "/daily-purchases/:id/approve",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_WRITE),
  controller.approveDailyPurchase.bind(controller),
);
router.post(
  "/monthly-report",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_READ),
  controller.generateMonthlyReport.bind(controller),
);
router.post(
  "/transactions",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_WRITE),
  controller.createTransaction.bind(controller),
);
router.put(
  "/transactions/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_WRITE),
  controller.updateTransaction.bind(controller),
);
router.delete(
  "/transactions/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.FINANCE_WRITE),
  controller.deleteTransaction.bind(controller),
);

export default router;
