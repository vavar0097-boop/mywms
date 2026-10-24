import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { LocationController } from "./location.controller";

const router = Router();

const locationController = new LocationController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.LOCATIONS_READ),
  locationController.getLocations.bind(locationController),
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.LOCATIONS_WRITE),
  locationController.createLocation.bind(locationController),
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.LOCATIONS_WRITE),
  locationController.updateLocation.bind(locationController),
);

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.LOCATIONS_WRITE),
  locationController.deleteLocation.bind(locationController),
);

export default router;
