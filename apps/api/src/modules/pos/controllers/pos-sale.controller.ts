import { Response } from "express";

import { AuthRequest } from "../../../middleware/auth.middleware";
import { UnauthorizedError } from "../../../utils/errors";
import {
  createdResponse,
  successResponse,
} from "../../../utils/response";

import { PosSaleService } from "../services/pos-sale.service";
import {
  createPosSaleSchema,
  voidPosSaleSchema,
} from "../validators/pos-sale.validator";

const service = new PosSaleService();

export class PosSaleController {
  getOutlets = async (
    _req: AuthRequest,
    res: Response,
  ) => {
    const outlets = await service.getOutlets();

    return successResponse(
      res,
      outlets,
      "POS outlets fetched successfully",
    );
  };

  getMenu = async (
    req: AuthRequest,
    res: Response,
  ) => {
    const menu = await service.getMenu({
      search:
        typeof req.query.search === "string"
          ? req.query.search
          : undefined,
      limit:
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined,
      cashierId: req.user?.id,
    });

    return successResponse(
      res,
      menu,
      "POS menu fetched successfully",
    );
  };

  createSale = async (
    req: AuthRequest,
    res: Response,
  ) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = createPosSaleSchema.parse(req.body);
    const sale = await service.createSale(req.user.id, dto);

    return createdResponse(
      res,
      sale,
      "POS sale created successfully",
    );
  };

  voidSale = async (
    req: AuthRequest,
    res: Response,
  ) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const dto = voidPosSaleSchema.parse(req.body);
    const sale = await service.voidSale(
      req.user.id,
      String(req.params.id),
      dto,
    );

    return successResponse(
      res,
      sale,
      "POS sale voided successfully",
    );
  };
}
