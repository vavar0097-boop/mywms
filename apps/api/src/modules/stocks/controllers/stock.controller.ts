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
import { StocktakeRepository } from "../repositories/stocktake.repository";
import {
  completeStocktakeSchema,
  createStocktakeSchema,
} from "../validators/stocktake.validator";
import { NotFoundError } from "../../../utils/errors";

export class StockController {
  private service =
    new StockService();
  private stocktakes = new StocktakeRepository();

  getStocktakes = async (req: AuthRequest, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    return successResponse(res, await this.stocktakes.findMany(limit), "Stock opnames fetched successfully");
  };

  getStocktake = async (req: AuthRequest, res: Response) => {
    const stocktake = await this.stocktakes.findById(String(req.params.id));
    if (!stocktake) throw new NotFoundError("Stock opname not found");
    return successResponse(res, stocktake, "Stock opname fetched successfully");
  };

  createStocktake = async (req: AuthRequest, res: Response) => {
    const dto = createStocktakeSchema.parse(req.body);
    const stocktake = await this.stocktakes.create(dto.location_id, req.user!.id);
    return createdResponse(res, stocktake, "Stock opname started successfully");
  };

  completeStocktake = async (req: AuthRequest, res: Response) => {
    const dto = completeStocktakeSchema.parse(req.body);
    const stocktake = await this.stocktakes.complete(String(req.params.id), req.user!.id, dto.counts);
    return successResponse(res, stocktake, "Stock opname completed successfully");
  };

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
