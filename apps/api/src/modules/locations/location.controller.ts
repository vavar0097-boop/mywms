import { Request, Response, NextFunction } from "express";

import { LocationService } from "./location.service";

const locationService = new LocationService();

export class LocationController {
  async getLocations(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search
          : undefined;

      const warehouse_id =
        typeof req.query.warehouse_id === "string"
          ? req.query.warehouse_id
          : undefined;

      const location_type =
        typeof req.query.location_type === "string"
          ? req.query.location_type
          : undefined;

      const limit =
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined;

      const locations = await locationService.getLocations({
        search,
        warehouse_id,
        location_type,
        limit,
      });

      res.status(200).json({
        success: true,
        message: "Locations retrieved successfully",
        data: locations,
      });
    } catch (error) {
      next(error);
    }
  }

  async createLocation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const location =
        await locationService.createLocation(req.body);

      res.status(201).json({
        success: true,
        message: "Location created successfully",
        data: location,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const location =
        await locationService.updateLocation(
          String(req.params.id),
          req.body,
        );

      res.status(200).json({
        success: true,
        message: "Location updated successfully",
        data: location,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLocation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await locationService.deleteLocation(String(req.params.id));

      res.status(200).json({
        success: true,
        message: "Location deleted successfully",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}
