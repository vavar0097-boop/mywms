import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
// import helmet from "helmet";
import morgan from "morgan";

import { logger } from "./config/logger";
import { env } from "./config/env";
import auditRoutes from "./modules/audit/audit.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { auditMiddleware } from "./middleware/audit.middleware";
import cashierSessionRoutes from "./modules/cashier-sessions/routes/cashier-session.route";
import itemRoutes from "./modules/items/routes/item.route";
import financeRoutes from "./modules/finance/finance.routes";
import globalReportRoutes from "./modules/global-report/global-report.routes";
import locationRoutes from "./modules/locations/location.routes";
import posRoutes from "./modules/pos/routes/pos.route";
import purchaseOrderRoutes from "./modules/purchase-orders/routes/purchase-order.route";
import settingsRoutes from "./modules/settings/settings.routes";
import stockRoutes from "./modules/stocks/routes/stock.route";
import transferRoutes from "./modules/transfers/routes/transfer.route";
import unitRoutes from "./modules/units/unit.routes";
import userRoutes from "./modules/users/user.routes";
import vendorRoutes from "./modules/vendors/vendor.routes";
import warehouseRoutes from "./modules/warehouses/warehouse.routes";
import authRoutes from "./routes/auth.routes";

const app = express();
const allowedOrigins = env.CLIENT_ORIGIN
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOriginPatterns = [
  /^https:\/\/[a-z0-9-]+\.pages\.dev$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
];

function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  return (
    allowedOrigins.includes(origin) ||
    allowedOriginPatterns.some((pattern) => pattern.test(origin))
  );
}

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }),
);

// app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json());

app.use(
  morgan("combined", {
    stream: {
      write: (message) => {
        logger.info(message.trim());
      },
    },
  }),
);

app.use(auditMiddleware);

function healthResponse() {
  return {
    success: true,
    message: "WMS API Online",
    data: {
      service: "enterprise-wms-api",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  };
}

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json(healthResponse());
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    ...healthResponse(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/cashier-sessions", cashierSessionRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/global-report", globalReportRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/settings", settingsRoutes);

// Error middleware wajib dipasang setelah seluruh route.
app.use(errorMiddleware);

export default app; 
