import { Response } from "express";

import { AuthRequest } from "../../../middleware/auth.middleware";
import {
  createdResponse,
  successResponse,
} from "../../../utils/response";
import { UnauthorizedError } from "../../../utils/errors";

import { PurchaseOrderService } from "../services/purchase-order.service";
import {
  createPurchaseOrderSchema,
  generateLowStockPurchaseOrderSchema,
  lowStockQuerySchema,
  parsePurchaseOrderImportSchema,
  purchaseOrderActionSchema,
  purchaseOrderQuerySchema,
  receivePurchaseOrderSchema,
} from "../validators/purchase-order.validator";

export class PurchaseOrderController {
  private service = new PurchaseOrderService();

  findMany = async (req: AuthRequest, res: Response) => {
    const query = purchaseOrderQuerySchema.parse(req.query);
    const result = await this.service.findMany(query);

    return successResponse(
      res,
      result,
      "Purchase orders retrieved successfully",
    );
  };

  findById = async (req: AuthRequest, res: Response) => {
    const row = await this.service.findById(String(req.params.id));

    return successResponse(
      res,
      row,
      "Purchase order retrieved successfully",
    );
  };

  create = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = createPurchaseOrderSchema.parse(req.body);
    const row = await this.service.create(dto, req.user.id);

    return createdResponse(
      res,
      row,
      "Purchase order created successfully",
    );
  };

  order = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = purchaseOrderActionSchema.parse(req.body);
    const row = await this.service.order(
      String(req.params.id),
      dto,
      req.user.id,
    );

    return successResponse(
      res,
      row,
      "Purchase order marked as ordered",
    );
  };

  cancel = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = purchaseOrderActionSchema.parse(req.body);
    const row = await this.service.cancel(
      String(req.params.id),
      dto,
      req.user.id,
    );

    return successResponse(
      res,
      row,
      "Purchase order cancelled successfully",
    );
  };

  receive = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = receivePurchaseOrderSchema.parse(req.body);
    const row = await this.service.receive(
      String(req.params.id),
      dto,
      req.user.id,
    );

    return successResponse(
      res,
      row,
      "Purchase order received successfully",
    );
  };

  parseImport = async (req: AuthRequest, res: Response) => {
    const dto = parsePurchaseOrderImportSchema.parse(req.body);
    const result = await this.service.parseImport(dto);

    return successResponse(
      res,
      result,
      "Purchase order import parsed successfully",
    );
  };

  lowStock = async (req: AuthRequest, res: Response) => {
    const query = lowStockQuerySchema.parse(req.query);
    const result = await this.service.findLowStockCandidates(query);

    return successResponse(
      res,
      result,
      "Low stock reorder candidates retrieved successfully",
    );
  };

  generateLowStock = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = generateLowStockPurchaseOrderSchema.parse(req.body);
    const row = await this.service.generateLowStockPurchaseOrder(
      dto,
      req.user.id,
    );

    return createdResponse(
      res,
      row,
      "Low stock purchase order draft created successfully",
    );
  };
}
