import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { PERMISSIONS } from "../../config/permissions";
import { permissionMiddleware } from "../../middleware/role.middleware";
import { UserController } from "./user.controller";

const router = Router();

const userController = new UserController();

router.get(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.USERS_READ),
  userController.getUsers.bind(userController),
);

router.get(
  "/roles",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.USERS_READ),
  userController.getRoles.bind(userController),
);

router.post(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.USERS_WRITE),
  userController.createUser.bind(userController),
);

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.USERS_WRITE),
  userController.updateUser.bind(userController),
);

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.USERS_WRITE),
  userController.deleteUser.bind(userController),
);

export default router;
