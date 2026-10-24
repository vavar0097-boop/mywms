import { Request, Response, NextFunction } from "express";

import { WarehouseService } from "./warehouse.service";

const warehouseService = new WarehouseService();

export class WarehouseController {
  async getWarehouses(
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

      const warehouses = await warehouseService.getWarehouses({
        search,
        limit,
      });

      res.status(200).json({
        success: true,
        message: "Warehouses retrieved successfully",
        data: warehouses,
      });
    } catch (error) {
      next(error);
    }
  }

  async createWarehouse(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const warehouse =
        await warehouseService.createWarehouse(req.body);

      res.status(201).json({
        success: true,
        message: "Warehouse created successfully",
        data: warehouse,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateWarehouse(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const warehouse =
        await warehouseService.updateWarehouse(
          String(req.params.id),
          req.body,
        );

      res.status(200).json({
        success: true,
        message: "Warehouse updated successfully",
        data: warehouse,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteWarehouse(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await warehouseService.deleteWarehouse(
        String(req.params.id),
      );

      res.status(200).json({
        success: true,
        message: "Warehouse deleted successfully",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}
