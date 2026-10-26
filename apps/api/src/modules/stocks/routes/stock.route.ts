import { Router } from "express";

import { authMiddleware } from "../../../middleware/auth.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { permissionMiddleware } from "../../../middleware/role.middleware";
import { asyncHandler } from "../../../utils/async-handler";
import { StockController } from "../controllers/stock.controller";

const router = Router();
const controller = new StockController();

router.get(
  "/current",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.STOCK_READ),
  asyncHandler(controller.getCurrentStocks),
);

router.get(
  "/ledgers",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.STOCK_READ),
  asyncHandler(controller.getLedgers),
);

router.get(
  "/opnames",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.STOCK_READ),
  asyncHandler(controller.getStocktakes),
);

router.get(
  "/opnames/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.STOCK_READ),
  asyncHandler(controller.getStocktake),
);

router.post(
  "/opnames",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.STOCKTAKE_WRITE),
  asyncHandler(controller.createStocktake),
);

router.post(
  "/opnames/:id/complete",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.STOCKTAKE_WRITE),
  asyncHandler(controller.completeStocktake),
);

router.post(
  "/initial",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.STOCK_WRITE),
  asyncHandler(controller.createInitialStock),
);

router.post(
  "/adjustment",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.STOCK_WRITE),
  asyncHandler(controller.createAdjustment),
);

export default router;
