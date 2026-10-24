import { Request, Response } from "express";

import {
  successResponse,
  createdResponse,
} from "../../../utils/response";

import { ItemService } from "../services/item.service";

import {
  createItemSchema,
  updateItemSchema,
  itemQuerySchema,
} from "../validators/item.validator";

export class ItemController {
  private service =
    new ItemService();

  getAll = async (
    req: Request,
    res: Response
  ) => {
    const query =
      itemQuerySchema.parse(
        req.query
      );

    const result =
      await this.service.findMany(
        query
      );

    return successResponse(
      res,
      result,
      "Items fetched successfully"
    );
  };

  getById = async (
    req: Request,
    res: Response
  ) => {
    const item =
      await this.service.findById(
        String(req.params.id)
      );

    return successResponse(
      res,
      item,
      "Item fetched successfully"
    );
  };

  create = async (
    req: Request,
    res: Response
  ) => {
    const dto =
      createItemSchema.parse(
        req.body
      );

    const item =
      await this.service.create(
        dto
      );

    return createdResponse(
      res,
      item,
      "Item created successfully"
    );
  };

  update = async (
    req: Request,
    res: Response
  ) => {
    const dto =
      updateItemSchema.parse(
        req.body
      );

    const item =
      await this.service.update(
        String(req.params.id),
        dto
      );

    return successResponse(
      res,
      item,
      "Item updated successfully"
    );
  };

  delete = async (
    req: Request,
    res: Response
  ) => {
    await this.service.delete(
      String(req.params.id)
    );

    return successResponse(
      res,
      null,
      "Item deleted successfully"
    );
  };
}