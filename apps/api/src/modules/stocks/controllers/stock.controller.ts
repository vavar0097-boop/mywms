import { Response } from "express";

import {
  successResponse,
  createdResponse,
} from "../../../utils/response";

import {
  AuthRequest,
} from "../../../middleware/auth.middleware";

import {
  StockService,
} from "../services/stock.service";

import {
  stockQuerySchema,
  createInitialStockSchema,
  createStockAdjustmentSchema,
} from "../validators/stock.validator";

export class StockController {
  private service =
    new StockService();

  getCurrentStocks = async (
    req: AuthRequest,
    res: Response
  ) => {
    const query =
      stockQuerySchema.parse(
        req.query
      );

    const result =
      await this.service
        .getCurrentStocks(
          query
        );

    return successResponse(
      res,
      result,
      "Current stocks fetched successfully"
    );
  };

  getLedgers = async (
    req: AuthRequest,
    res: Response
  ) => {
    const query =
      stockQuerySchema.parse(
        req.query
      );

    const result =
      await this.service
        .getLedgers(
          query
        );

    return successResponse(
      res,
      result,
      "Stock ledgers fetched successfully"
    );
  };

  createInitialStock = async (
    req: AuthRequest,
    res: Response
  ) => {
    const dto =
      createInitialStockSchema.parse(
        req.body
      );

    const result =
      await this.service
        .createInitialStock(
          dto,
          req.user
        );

    return createdResponse(
      res,
      result,
      "Initial stock created successfully"
    );
  };

  createAdjustment = async (
    req: AuthRequest,
    res: Response
  ) => {
    const dto =
      createStockAdjustmentSchema.parse(
        req.body
      );

    const result =
      await this.service
        .createAdjustment(
          dto,
          req.user
        );

    return createdResponse(
      res,
      result,
      "Stock adjustment created successfully"
    );
  };
}