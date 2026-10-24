import { Request, Response, NextFunction } from "express";

import { VendorService } from "./vendor.service";

const vendorService = new VendorService();

export class VendorController {
  async getVendors(
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

      const vendors = await vendorService.findMany({
        search,
        limit,
      });

      res.status(200).json({
        success: true,
        message: "Vendors retrieved successfully",
        data: vendors,
      });
    } catch (error) {
      next(error);
    }
  }

  async createVendor(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const vendor = await vendorService.create(req.body);

      res.status(201).json({
        success: true,
        message: "Vendor created successfully",
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateVendor(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const vendor = await vendorService.update(
        String(req.params.id),
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Vendor updated successfully",
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteVendor(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await vendorService.delete(String(req.params.id));

      res.status(200).json({
        success: true,
        message: "Vendor disabled successfully",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}
