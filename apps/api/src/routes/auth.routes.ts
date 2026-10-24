import { Router } from "express";

import {
authMiddleware,
} from "../middleware/auth.middleware";



import { AuthController }
  from "../modules/auth/controllers/auth.controller";

const router = Router();

const controller =
  new AuthController();

router.get(
"/me",
authMiddleware,
controller.me
);

router.post(
  "/login",
  controller.login
);

router.post(
  "/logout",
  controller.logout
);

router.post(
  "/refresh",
  controller.refresh
);

export default router;
