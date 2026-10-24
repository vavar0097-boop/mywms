import { NextFunction, Request, Response } from "express";

import { PosMenuService } from "./pos-menu.service";

const service = new PosMenuService();

export class PosMenuController {
  async getMenuItems(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const items = await service.getMenuItems({
        search:
          typeof req.query.search === "string"
            ? req.query.search
            : undefined,
        visible_only: req.query.visible_only === "true",
        limit:
          typeof req.query.limit === "string"
            ? Number(req.query.limit)
            : undefined,
      });

      res.status(200).json({
        success: true,
        message: "POS menu items retrieved successfully",
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  async createMenuItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const item = await service.createMenuItem(req.body);

      res.status(201).json({
        success: true,
        message: "POS menu item created successfully",
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMenuItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const item = await service.updateMenuItem(
        String(req.params.id),
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "POS menu item updated successfully",
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMenuItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await service.deleteMenuItem(String(req.params.id));

      res.status(200).json({
        success: true,
        message: "POS menu item deleted successfully",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBom(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const components = await service.getBom(String(req.params.id));

      res.status(200).json({
        success: true,
        message: "POS menu BOM retrieved successfully",
        data: components,
      });
    } catch (error) {
      next(error);
    }
  }

  async replaceBom(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const components = await service.replaceBom(
        String(req.params.id),
        req.body?.components,
      );

      res.status(200).json({
        success: true,
        message: "POS menu BOM saved successfully",
        data: components,
      });
    } catch (error) {
      next(error);
    }
  }
}
