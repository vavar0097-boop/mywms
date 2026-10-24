import { NextFunction, Request, Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";
import { FinanceService } from "./finance.service";

const financeService = new FinanceService();

export class FinanceController {
  async getTransactions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const transactions = await financeService.getTransactions({
        search:
          typeof req.query.search === "string"
            ? req.query.search
            : undefined,
        type:
          typeof req.query.type === "string"
            ? req.query.type
            : undefined,
        limit:
          typeof req.query.limit === "string"
            ? Number(req.query.limit)
            : undefined,
      });

      res.status(200).json({
        success: true,
        message: "Finance transactions retrieved successfully",
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const summary = await financeService.getSummary();

      res.status(200).json({
        success: true,
        message: "Finance summary retrieved successfully",
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const transaction =
        await financeService.createTransaction(req.body);

      res.status(201).json({
        success: true,
        message: "Finance transaction created successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCashierSettlements(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const rows = await financeService.getCashierSettlements({
        status:
          typeof req.query.status === "string"
            ? req.query.status
            : undefined,
        limit:
          typeof req.query.limit === "string"
            ? Number(req.query.limit)
            : undefined,
      });

      res.status(200).json({
        success: true,
        message: "Cashier settlements retrieved successfully",
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPosSales(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const rows = await financeService.getPosSales({
        status:
          typeof req.query.status === "string"
            ? req.query.status
            : undefined,
        limit:
          typeof req.query.limit === "string"
            ? Number(req.query.limit)
            : undefined,
      });

      res.status(200).json({
        success: true,
        message: "POS sales retrieved successfully",
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const transaction =
        await financeService.updateTransaction(
          String(req.params.id),
          req.body,
        );

      res.status(200).json({
        success: true,
        message: "Finance transaction updated successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await financeService.deleteTransaction(String(req.params.id));

      res.status(200).json({
        success: true,
        message: "Finance transaction deleted successfully",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async parseDailyPurchase(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await financeService.parseDailyPurchase(
        String(req.body.raw_text ?? ""),
      );

      res.status(200).json({
        success: true,
        message: "Daily purchase parsed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDailyPurchases(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const rows = await financeService.getDailyPurchases({
        status:
          typeof req.query.status === "string"
            ? req.query.status
            : undefined,
        limit:
          typeof req.query.limit === "string"
            ? Number(req.query.limit)
            : undefined,
      });

      res.status(200).json({
        success: true,
        message: "Daily purchases retrieved successfully",
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }

  async createDailyPurchase(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const row = await financeService.createDailyPurchase(
        String(req.user?.id),
        req.body,
      );

      res.status(201).json({
        success: true,
        message: "Daily purchase draft created successfully",
        data: row,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDailyPurchase(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const row = await financeService.updateDailyPurchase(
        String(req.user?.id),
        String(req.params.id),
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Daily purchase draft updated successfully",
        data: row,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveDailyPurchase(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const row = await financeService.approveDailyPurchase(
        String(req.user?.id),
        String(req.params.id),
      );

      res.status(200).json({
        success: true,
        message: "Daily purchase approved successfully",
        data: row,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateMonthlyReport(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const report = await financeService.generateMonthlyReport({
        month: String(req.body.month ?? ""),
        sync_google: Boolean(req.body.sync_google),
      });

      res.status(200).json({
        success: true,
        message: "Monthly report generated successfully",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}
