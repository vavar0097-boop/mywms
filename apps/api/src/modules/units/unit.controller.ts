import { NextFunction, Request, Response } from "express";

import { UnitService } from "./unit.service";

const unitService = new UnitService();

export class UnitController {
  async getUnits(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search
          : undefined;

      const limit =
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined;

      const units = await unitService.getUnits({
        search,
        limit,
      });

      res.status(200).json({
        success: true,
        message: "Units retrieved successfully",
        data: units,
      });
    } catch (error) {
      next(error);
    }
  }
}
